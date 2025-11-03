
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Loader2, CheckCircle, AlertCircle, RefreshCw, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CullCard from "../components/culling/CullCard";
import StatsOverview from "../components/culling/StatsOverview";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

// SIMPLIFIED: Just get cached data immediately
const getCachedUser = () => {
  try {
    const cached = localStorage.getItem('cachedUser');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const getCachedCulls = () => {
  try {
    const cached = localStorage.getItem('cachedCulls');
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [viewMode, setViewMode] = useState('overview');
  const [user, setUser] = useState(getCachedUser());
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(!getCachedUser()); // Only show loading if no cached user

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // CRITICAL FIX: Don't block render waiting for user fetch
  useEffect(() => {
    if (!user && isOnline) {
      const fetchUser = async () => {
        try {
          const userData = await base44.auth.me();
          setUser(userData);
          localStorage.setItem('cachedUser', JSON.stringify(userData));
        } catch (error) {
          console.error("Failed to load user:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUser();
    } else if (!user) {
      // Offline and no cached user - wait a moment in case SW is still loading
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [user, isOnline]);

  const { data: culls = [] } = useQuery({
    queryKey: ['culls', user?.email],
    queryFn: async () => {
      const cachedCulls = getCachedCulls();
      
      if (!isOnline || !user) {
        return cachedCulls;
      }
      
      try {
        let freshCulls;
        if (user.role === 'admin') {
          freshCulls = await base44.entities.DeerCull.list('-created_date', 100);
        } else {
          freshCulls = await base44.entities.DeerCull.filter(
            { user_email: user.email },
            '-created_date',
            100
          );
        }
        
        localStorage.setItem('cachedCulls', JSON.stringify(freshCulls));
        return freshCulls;
      } catch (error) {
        console.error("Failed to fetch culls:", error);
        return cachedCulls;
      }
    },
    initialData: getCachedCulls(),
    enabled: !!user,
    retry: false,
  });

  const syncPendingCulls = async () => {
    if (!isOnline) {
      setSyncMessage('Cannot sync while offline');
      return;
    }

    setSyncing(true);
    setSyncMessage('');
    
    try {
      const pending = localStorage.getItem('pendingCulls');
      if (!pending) {
        setSyncMessage('No pending records to sync');
        setSyncing(false);
        return;
      }

      const pendingCulls = JSON.parse(pending);
      const userPendingCulls = user.role === 'admin' 
        ? pendingCulls 
        : pendingCulls.filter(cull => cull.user_email === user.email);
      
      if (userPendingCulls.length === 0) {
        setSyncMessage('No pending records to sync');
        setSyncing(false);
        return;
      }

      let successCount = 0;
      const remaining = [];

      for (const cull of pendingCulls) {
        if (user.role === 'admin' || cull.user_email === user.email) {
          try {
            await base44.entities.DeerCull.create(cull);
            successCount++;
          } catch (error) {
            console.error('Failed to sync cull:', error);
            remaining.push(cull);
          }
        } else {
          remaining.push(cull);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem('pendingCulls', JSON.stringify(remaining));
        setSyncMessage(`Synced ${successCount} records. ${remaining.filter(c => user.role === 'admin' || c.user_email === user.email).length} failed.`);
      } else {
        localStorage.removeItem('pendingCulls');
        setSyncMessage(`Successfully synced all ${successCount} records!`);
      }

      queryClient.invalidateQueries({ queryKey: ['culls'] });
    } catch (error) {
      setSyncMessage('Sync failed. Please try again.');
      console.error('Sync error:', error);
    }
    
    setSyncing(false);
  };

  useEffect(() => {
    const handleOnlineEvent = () => {
      const pending = localStorage.getItem('pendingCulls');
      if (pending && JSON.parse(pending).length > 0 && user) {
        syncPendingCulls();
      }
      queryClient.invalidateQueries({ queryKey: ['culls'] });
    };

    window.addEventListener('online', handleOnlineEvent);
    return () => window.removeEventListener('online', handleOnlineEvent);
  }, [user]);

  const pendingCount = (() => {
    try {
      const pending = localStorage.getItem('pendingCulls');
      if (!pending || !user) return 0;
      
      const allPending = JSON.parse(pending);
      if (user.role === 'admin') {
        return allPending.length;
      } else {
        return allPending.filter(cull => cull.user_email === user.email).length;
      }
    } catch {
      return 0;
    }
  })();

  const getPendingCulls = () => {
    try {
      const pending = localStorage.getItem('pendingCulls');
      if (!pending || !user) return [];
      
      const allPending = JSON.parse(pending);
      if (user.role === 'admin') {
        return allPending;
      } else {
        return allPending.filter(cull => cull.user_email === user.email);
      }
    } catch {
      return [];
    }
  };

  const displayedCulls = viewMode === 'overview' 
    ? culls.slice(0, 20) 
    : viewMode === 'pending' 
    ? getPendingCulls()
    : culls;

  // CRITICAL FIX: Show loading only briefly, then show app shell
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // CRITICAL FIX: Don't show "offline setup" message immediately
  // Let the app load first, then prompt for login only if truly needed
  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 p-4">
        <Target className="w-16 h-16 text-slate-600" />
        <h2 className="text-xl text-white font-semibold">Welcome to DeerTrack</h2>
        <p className="text-slate-400 text-center max-w-md">
          {isOnline 
            ? 'Please log in to get started' 
            : 'Please connect to the internet and log in for the first time'}
        </p>
        {isOnline && (
          <Button 
            onClick={() => base44.auth.redirectToLogin(window.location.href)}
            className="bg-orange-600 hover:bg-orange-700 mt-4"
          >
            Go to Login
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <ServiceWorkerRegister />
      <div className="min-h-screen bg-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Culling Dashboard</h1>
              <p className="text-slate-400 mt-1">
                {user?.role === 'admin' ? 'Viewing all culls' : 'Track and manage your deer culls'}
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              {pendingCount > 0 && (
                <Button
                  variant="outline"
                  className="flex-1 md:flex-none border-orange-700 text-orange-300 hover:bg-orange-900 hover:text-orange-200"
                  onClick={syncPendingCulls}
                  disabled={syncing || !isOnline}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync {pendingCount} Record{pendingCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
              <Link to={createPageUrl("RecordCull")} className="flex-1 md:flex-none">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium h-16">
                  <Plus className="w-5 h-5 mr-2" />
                  Record Cull
                </Button>
              </Link>
            </div>
          </div>

          {syncMessage && (
            <div className={`mb-6 p-4 rounded-lg border ${
              syncMessage.includes('Successfully') 
                ? 'bg-green-900 bg-opacity-30 border-green-700 text-green-300' 
                : syncMessage.includes('failed') || syncMessage.includes('Cannot')
                ? 'bg-red-900 bg-opacity-30 border-red-700 text-red-300'
                : 'bg-blue-900 bg-opacity-30 border-blue-700 text-blue-300'
            }`}>
              {syncMessage.includes('Successfully') ? (
                <CheckCircle className="w-4 h-4 inline mr-2" />
              ) : (
                <AlertCircle className="w-4 h-4 inline mr-2" />
              )}
              {syncMessage}
            </div>
          )}

          {viewMode === 'overview' && (
            <StatsOverview 
              culls={culls} 
              pendingCount={pendingCount}
              onTotalClick={() => setViewMode('all')}
              onPendingClick={() => pendingCount > 0 && setViewMode('pending')}
            />
          )}

          {viewMode !== 'overview' && (
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => setViewMode('overview')}
                className="border-slate-700 bg-white text-black hover:bg-gray-100"
              >
                ← Back to Overview
              </Button>
            </div>
          )}

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-xl font-bold text-white">
                {viewMode === 'overview' && 'Recent Culls (Last 20)'}
                {viewMode === 'all' && `All Culls (${culls.length})`}
                {viewMode === 'pending' && `Pending Sync (${pendingCount})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {displayedCulls.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400 text-lg mb-2">
                    {!isOnline 
                      ? 'You are offline - Record new culls to sync later' 
                      : 'No culls recorded yet'}
                  </p>
                  <p className="text-slate-500 text-sm mb-6">Start by recording your first deer cull</p>
                  <Link to={createPageUrl("RecordCull")}>
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Record First Cull
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {displayedCulls.map((cull, index) => (
                    <CullCard key={cull.id || `pending-${index}`} cull={cull} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}