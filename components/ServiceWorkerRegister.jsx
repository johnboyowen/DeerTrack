import { useEffect } from 'react';

// Service Worker Registration Component
// This component registers the service worker for offline-first functionality

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[SW] Service Worker registered successfully:', registration.scope);
            
            // Check for updates periodically (every 60 seconds)
            setInterval(() => {
              registration.update();
            }, 60000);
            
            // Handle updates - NON-BLOCKING
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              console.log('[SW] New service worker found, installing...');
              
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[SW] New version ready. Will activate on next navigation.');
                  
                  // CRITICAL FIX: Don't force reload - show optional prompt instead
                  // This prevents blocking the cached shell on weak connections
                  const shouldUpdate = confirm('A new version of DeerTrack is available. Update now?');
                  
                  if (shouldUpdate) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    // Wait a moment for activation, then reload
                    setTimeout(() => window.location.reload(), 100);
                  }
                }
              });
            });
          })
          .catch((error) => {
            console.log('[SW] Service Worker registration failed:', error);
          });
        
        // CRITICAL FIX: Remove automatic reload on controller change
        // This was causing hard reloads before cache could serve shell
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            console.log('[SW] New controller activated');
            // Don't reload automatically - let it happen naturally or via user prompt
          }
        });
      });
      
      // Log current service worker status
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[SW] Service Worker is active and ready');
        
        // Get version from service worker
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data && event.data.version) {
            console.log('[SW] Current version:', event.data.version);
          }
        };
        
        if (registration.active) {
          registration.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
        }
      });
    } else {
      console.log('[SW] Service Workers not supported in this browser');
    }
  }, []);

  return null; // This component doesn't render anything
}