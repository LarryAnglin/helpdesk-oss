/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

// Service Worker registration for PWA functionality

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
};

export function registerSW(config?: Config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(
      import.meta.env.PUBLIC_URL || '/',
      window.location.href
    );
    
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.PUBLIC_URL || ''}/sw.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('PWA: Service worker is ready for localhost');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('PWA: App is back online');
      config?.onOnline?.();
    });
    
    window.addEventListener('offline', () => {
      console.log('PWA: App is offline');
      config?.onOffline?.();
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('PWA: Service worker registered successfully');
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('PWA: New content available, update ready');
              config?.onUpdate?.(registration);
            } else {
              console.log('PWA: Content cached for offline use');
              config?.onSuccess?.(registration);
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('PWA: Service worker registration failed:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('PWA: No internet connection, running in offline mode');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// PWA Install prompt
export function setupInstallPrompt() {
  let deferredPrompt: any;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install button
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('PWA: User accepted the install prompt');
            } else {
              console.log('PWA: User dismissed the install prompt');
            }
            deferredPrompt = null;
          });
        }
      });
    }
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('PWA: App was installed');
    deferredPrompt = null;
    
    // Hide install button
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  });
}

// Check if app is running as PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://');
}

// Background sync for offline data
export function requestBackgroundSync(tag: string) {
  if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration: any) => {
      return registration.sync.register(tag);
    }).catch((error) => {
      console.error('PWA: Background sync registration failed:', error);
    });
  }
}

// Send message to service worker
export function sendMessageToSW(message: any) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

// Listen for messages from service worker
export function listenForSWMessages(callback: (message: any) => void) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      callback(event.data);
    });
  }
}