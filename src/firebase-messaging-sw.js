// Firebase Cloud Messaging Service Worker
// Handles background notifications when app is not in focus

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhLGOQVJXuQqKQcNZqKcJQrKmWJYOQvKQ",
  authDomain: "zarx-arecofix.firebaseapp.com",
  projectId: "zarx-arecofix",
  storageBucket: "zarx-arecofix.firebasestorage.app",
  messagingSenderId: "1049867730734",
  appId: "1:1049867730734:web:c8e4c0e0a9e5e5e5e5e5e5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || '🚨 Nueva Alerta ZARX';
  const notificationOptions = {
    body: payload.notification?.body || 'Nueva alerta recibida',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    tag: 'zarx-alert',
    requireInteraction: true,
    data: {
      url: '/admin/dispatch',
      ...payload.data
    },
    actions: [
      {
        action: 'open',
        title: 'Ver Alerta'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    // Open the app at the dispatch console
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes('/admin/dispatch') && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow('/admin/dispatch');
          }
        })
    );
  }
});
