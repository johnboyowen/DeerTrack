
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, Plus, BarChart3, User, Wifi, WifiOff, CloudUpload } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const APP_VERSION = "1.1.0";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: BarChart3,
  },
  {
    title: "Record Cull",
    url: createPageUrl("RecordCull"),
    icon: Plus,
  },
  {
    title: "Profile",
    url: createPageUrl("Profile"),
    icon: User,
  },
];

// SIMPLIFIED: Just get cached user
const getCachedUser = () => {
  try {
    const cached = localStorage.getItem('cachedUser');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

function LayoutContent({ children }) {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [user, setUser] = useState(getCachedUser()); // Start with cached user
  const { setOpenMobile } = useSidebar();

  // Check if Service Worker is active
  const [swActive, setSwActive] = useState(false);

  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

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

  useEffect(() => {
    const checkPending = () => {
      try {
        const pending = localStorage.getItem('pendingCulls');
        if (pending) {
          const culls = JSON.parse(pending);
          setPendingCount(culls.length);
        } else {
          setPendingCount(0);
        }
      } catch (error) {
        setPendingCount(0);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setSwActive(true);
        console.log('[Layout] Service Worker is active');
      });
    }
  }, []);

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-900">
      <Sidebar className="border-r border-slate-700 bg-slate-800">
        <SidebarHeader className="border-b border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-white text-lg">DeerTrack</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400">Field Culling System</p>
                <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600 text-[10px] px-1.5 py-0">
                  v{APP_VERSION}
                </Badge>
                {swActive && (
                  <Badge variant="outline" className="bg-green-900 text-green-300 border-green-700 text-[10px] px-1.5 py-0" title="Offline mode enabled">
                    PWA
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="p-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`hover:bg-slate-700 hover:text-white transition-colors duration-200 rounded-lg mb-1 ${
                        location.pathname === item.url ? 'bg-slate-700 text-white' : 'text-slate-300'
                      }`}
                    >
                      <Link to={item.url} onClick={handleNavClick} className="flex items-center gap-3 px-3 py-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <div className="px-3 py-2 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg">
                {isOnline ? (
                  <>
                    <Wifi className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Online</p>
                      <p className="text-xs text-slate-400">Data syncing</p>
                    </div>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-orange-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Offline Mode</p>
                      <p className="text-xs text-slate-400">Data saved locally</p>
                    </div>
                  </>
                )}
              </div>

              {pendingCount > 0 && (
                <div className="flex items-center gap-3 p-3 bg-orange-900 bg-opacity-30 border border-orange-700 rounded-lg">
                  <CloudUpload className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Pending Sync</p>
                    <p className="text-xs text-orange-300">{pendingCount} record{pendingCount !== 1 ? 's' : ''} waiting</p>
                  </div>
                </div>
              )}
            </div>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm truncate">
                {user?.full_name || 'Offline Mode'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email || 'Log in when online'}</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 md:hidden">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-slate-700 p-2 rounded-lg transition-colors duration-200 text-white" />
            <h1 className="text-xl font-semibold text-white">DeerTrack</h1>
            <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
              v{APP_VERSION}
            </Badge>
            {!isOnline && (
              <Badge variant="outline" className="bg-orange-900 text-orange-300 border-orange-700">
                Offline
              </Badge>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-900">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <SidebarProvider>
      <LayoutContent children={children} />
    </SidebarProvider>
  );
}
