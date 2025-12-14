// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// IMPORTANT: Replace these placeholder values with your Firebase project config
firebase.initializeApp({
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Help Desk Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.data?.type || 'notification',
    data: payload.data,
    requireInteraction: ['ticket_assigned', 'system_alert'].includes(payload.data?.type),
    actions: payload.notification?.actions || []
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  // Handle action button clicks
  if (event.action) {
    console.log('[firebase-messaging-sw.js] Notification action clicked:', event.action);
    
    switch (event.action) {
      case 'view':
        if (event.notification.data?.ticketId) {
          event.waitUntil(
            clients.openWindow(`/tickets/${event.notification.data.ticketId}`)
          );
        }
        break;
      case 'dismiss':
        // Just close the notification (already done above)
        break;
      default:
        // Default action - open the app
        event.waitUntil(clients.openWindow('/'));
    }
  } else {
    // Default click action - open the relevant page or app
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(function(clientList) {
        // Check if a client is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no client is open, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});