export const environment = {
  production: true,
  
  // Supabase
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
  
  // Firebase
  firebase: {
    apiKey: "AIzaSyAhLGOQVJXuQqKQcNZqKcJQrKmWJYOQvKQ",
    authDomain: "zarx-arecofix.firebaseapp.com",
    projectId: "zarx-arecofix",
    storageBucket: "zarx-arecofix.firebasestorage.app",
    messagingSenderId: "1049867730734",
    appId: "1:1049867730734:web:c8e4c0e0a9e5e5e5e5e5e5",
    measurementId: "G-XXXXXXXXXX"
  },
  
  // Firebase Cloud Messaging
  fcm: {
    vapidKey: 'YOUR_VAPID_KEY_HERE' // Get from Firebase Console > Project Settings > Cloud Messaging
  },
  
  // Storage
  storage: {
    bucketName: 'incidencia-evidencia',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
  },
  
  // External Services
  telegram: {
    botToken: '', // Optional: Your Telegram Bot Token
    chatId: ''    // Optional: Your Telegram Chat/Group ID
  },
  
  // Monitoring (Optional)
  sentry: {
    dsn: '', // Optional: Sentry DSN for error tracking
    environment: 'production',
    tracesSampleRate: 0.1
  },
  
  // App Config
  app: {
    name: 'ZARX Security System',
    version: '1.0.0',
    domain: 'https://zarx.arecofix.com.ar',
    supportEmail: 'support@arecofix.com.ar'
  },
  
  // Feature Flags
  features: {
    enablePushNotifications: true,
    enableTelegram: false, // Set to true when configured
    enableOfflineMode: true,
    enableErrorTracking: false, // Set to true when Sentry configured
    enableHeatmap: true,
    enableCamera: true
  },
  
  // Maps
  maps: {
    defaultZoom: 13,
    maxZoom: 18,
    minZoom: 10
  },
  
  // Geocoding
  geocoding: {
    provider: 'nominatim',
    rateLimit: 1000, // ms between requests
    userAgent: 'ZARX-Security-App/1.0'
  }
};
