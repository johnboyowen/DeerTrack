
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Shield, LogOut, Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const APP_VERSION = "1.1.0";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);
  const [swActive, setSwActive] = useState(false);
  const [swVersion, setSwVersion] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Failed to load user", error);
      }
      setLoading(false);
    };
    loadUser();
    
    // Check Service Worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwActive(true);
        
        // Get SW version
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data && event.data.version) {
            setSwVersion(event.data.version);
          }
        };
        
        if (registration.active) {
          registration.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
        }
      }).catch(error => {
        console.warn("Service Worker not ready or encountered an error:", error);
        setSwActive(false);
      });
    } else {
      setSwActive(false); // Browser does not support service workers
    }
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const checkForUpdates = async () => {
    if (!navigator.onLine) {
      setUpdateMessage({ type: 'error', text: 'Cannot check for updates while offline' });
      return;
    }

    setCheckingUpdate(true);
    setUpdateMessage(null);

    try {
      // Fetch the current page with cache-busting
      const response = await fetch(window.location.href, {
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      const lastModified = response.headers.get('last-modified');
      const storedVersion = localStorage.getItem('appVersion');

      if (!lastModified) {
        setUpdateMessage({ type: 'info', text: 'Unable to check version. Try again later.' });
        setCheckingUpdate(false);
        return;
      }

      if (!storedVersion) {
        // First time checking - store current version
        localStorage.setItem('appVersion', lastModified);
        setUpdateMessage({ type: 'success', text: 'App is up to date!' });
        setCheckingUpdate(false);
        return;
      }

      if (storedVersion !== lastModified) {
        // New version available
        setUpdateMessage({ type: 'update', text: 'Update found! Installing...' });
        
        // Store new version and reload
        setTimeout(() => {
          localStorage.setItem('appVersion', lastModified);
          window.location.reload(true);
        }, 1000);
      } else {
        setUpdateMessage({ type: 'success', text: 'App is up to date!' });
        setCheckingUpdate(false);
      }
    } catch (error) {
      console.error('Update check failed:', error);
      setUpdateMessage({ type: 'error', text: 'Failed to check for updates. Try again.' });
      setCheckingUpdate(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Profile</h1>

        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">User Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{user?.full_name}</h3>
                <Badge variant="outline" className={`mt-1 ${
                  user?.role === 'admin' 
                    ? 'bg-orange-900 text-orange-300 border-orange-700' 
                    : 'bg-slate-700 text-slate-300 border-slate-600'
                }`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {user?.role || 'user'}
                </Badge>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="text-white">{user?.email}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">App Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">App Version</p>
                <p className="text-white font-medium">v{APP_VERSION}</p>
              </div>
              <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600">
                DeerTrack
              </Badge>
            </div>

            {swActive && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div>
                  <p className="text-sm text-slate-500">Offline Support</p>
                  <p className="text-green-400 font-medium text-sm">✓ Enabled</p>
                  {swVersion && (
                    <p className="text-xs text-slate-500 mt-1">Cache: {swVersion}</p>
                  )}
                </div>
                <Badge className="bg-green-900 text-green-300 border-green-700">
                  PWA Active
                </Badge>
              </div>
            )}

            {!swActive && navigator.onLine && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div>
                  <p className="text-sm text-slate-500">Offline Support</p>
                  <p className="text-orange-400 font-medium text-sm">Installing...</p>
                  <p className="text-xs text-slate-500 mt-1">Refresh to activate</p>
                </div>
              </div>
            )}

            {updateMessage && (
              <Alert className={`${
                updateMessage.type === 'success' 
                  ? 'bg-green-900 bg-opacity-30 border-green-700' 
                  : updateMessage.type === 'update'
                  ? 'bg-blue-900 bg-opacity-30 border-blue-700'
                  : updateMessage.type === 'info'
                  ? 'bg-slate-700 border-slate-600'
                  : 'bg-red-900 bg-opacity-30 border-red-700'
              }`}>
                {updateMessage.type === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                )}
                {updateMessage.type === 'update' && (
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                )}
                <AlertDescription className={
                  updateMessage.type === 'success' ? 'text-green-300' : 
                  updateMessage.type === 'update' ? 'text-blue-300' :
                  updateMessage.type === 'info' ? 'text-slate-300' :
                  'text-red-300'
                }>
                  {updateMessage.text}
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              onClick={checkForUpdates}
              disabled={checkingUpdate || !navigator.onLine}
              className="w-full border-slate-700 bg-white text-black hover:bg-gray-100"
            >
              {checkingUpdate ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking for updates...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check for Updates
                </>
              )}
            </Button>

            {!navigator.onLine && (
              <p className="text-xs text-slate-500 text-center">
                Updates check requires internet connection
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Account Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}