/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const CACHE_NAME = 'helpdesk-v2';
const STATIC_CACHE_NAME = 'helpdesk-static-v2';
const DYNAMIC_CACHE_NAME = 'helpdesk-dynamic-v2';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-72.png?v=2',
  '/icons/icon-96.png?v=2',
  '/icons/icon-128.png?v=2',
  '/icons/icon-144.png?v=2',
  '/icons/icon-152.png?v=2',
  '/icons/icon-192.png?v=2',
  '/icons/icon-384.png?v=2',
  '/icons/icon-512.png?v=2'
];

// API endpoints that should be cached
const CACHE_API_PATTERNS = [
  /\/api\/tickets/,
  /\/api\/faqs/,
  /\/api\/config/
];

// Files that should not be cached
const EXCLUDE_PATTERNS = [
  /\/api\/auth/,
  /\/api\/upload/,
  /firebase-messaging-sw.js/
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip excluded patterns
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }
  
  // Handle different types of requests
  if (request.destination === 'document') {
    // HTML pages - Network first, fallback to cache
    event.respondWith(networkFirstStrategy(request));
  } else if (CACHE_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    // API requests - Cache first for better offline experience
    event.respondWith(cacheFirstStrategy(request));
  } else if (request.destination === 'image') {
    // Images - Cache first
    event.respondWith(cacheFirstStrategy(request));
  } else if (request.destination === 'script' || 
             request.destination === 'style' ||
             request.destination === 'font') {
    // Static assets - Cache first
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Everything else - Network first
    event.respondWith(networkFirstStrategy(request));
  }
});

// Network first strategy - try network, fallback to cache
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Cache first strategy - try cache, fallback to network
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Both cache and network failed for:', request.url);
    throw error;
  }
}

// Update cache in background without blocking the response
function updateCacheInBackground(request) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        return caches.open(DYNAMIC_CACHE_NAME)
          .then(cache => cache.put(request, response));
      }
    })
    .catch(error => {
      console.log('Service Worker: Background cache update failed:', error);
    });
}

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from Help Desk',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'helpdesk-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Help Desk', options)
    );
  } catch (error) {
    console.error('Service Worker: Failed to show notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  const data = event.notification.data;
  const action = event.action;
  
  let url = '/';
  
  if (data && data.url) {
    url = data.url;
  } else if (action === 'view-ticket' && data && data.ticketId) {
    url = `/tickets/${data.ticketId}`;
  } else if (action === 'dashboard') {
    url = '/dashboard';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle background sync
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'ticket-submit') {
    event.waitUntil(syncPendingTickets());
  } else if (event.tag === 'ticket-reply') {
    event.waitUntil(syncPendingReplies());
  }
});

// Sync pending tickets when back online
async function syncPendingTickets() {
  try {
    // This would integrate with your ticket service
    console.log('Service Worker: Syncing pending tickets...');
    
    // Send message to main thread to handle sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PENDING_TICKETS'
      });
    });
  } catch (error) {
    console.error('Service Worker: Failed to sync pending tickets:', error);
  }
}

// Sync pending replies when back online
async function syncPendingReplies() {
  try {
    console.log('Service Worker: Syncing pending replies...');
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PENDING_REPLIES'
      });
    });
  } catch (error) {
    console.error('Service Worker: Failed to sync pending replies:', error);
  }
}

// Listen for messages from main thread
self.addEventListener('message', event => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_TICKET') {
    // Cache important ticket data
    const ticketData = event.data.ticket;
    caches.open(DYNAMIC_CACHE_NAME)
      .then(cache => {
        cache.put(
          new Request(`/api/tickets/${ticketData.id}`),
          new Response(JSON.stringify(ticketData))
        );
      });
  } else if (event.data && event.data.type === 'MANIFEST_UPDATED') {
    // Handle manifest update
    console.log('Service Worker: Manifest updated', event.data.manifest);
    
    // Cache new manifest
    const manifestBlob = new Blob([JSON.stringify(event.data.manifest)], {
      type: 'application/json'
    });
    
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        cache.put('/manifest.json', new Response(manifestBlob));
      });
    
    // Cache new icons
    if (event.data.manifest.icons) {
      caches.open(STATIC_CACHE_NAME)
        .then(cache => {
          event.data.manifest.icons.forEach(icon => {
            if (icon.src.startsWith('http')) {
              cache.add(icon.src).catch(console.error);
            }
          });
        });
    }
  }
});