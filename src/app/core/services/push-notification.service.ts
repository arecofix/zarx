import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { initializeApp, FirebaseApp } from 'firebase/app';

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private supabase = inject(SupabaseService).client;

  // Signals
  isSupported = signal(false);
  hasPermission = signal(false);
  fcmToken = signal<string | null>(null);
  lastNotification = signal<PushNotification | null>(null);

  private messaging: Messaging | null = null;
  private firebaseApp: FirebaseApp | null = null;

  // Firebase config (from your Firebase project)
  private readonly firebaseConfig = {
    apiKey: "AIzaSyAhLGOQVJXuQqKQcNZqKcJQrKmWJYOQvKQ",
    authDomain: "zarx-arecofix.firebaseapp.com",
    projectId: "zarx-arecofix",
    storageBucket: "zarx-arecofix.firebasestorage.app",
    messagingSenderId: "1049867730734",
    appId: "1:1049867730734:web:c8e4c0e0a9e5e5e5e5e5e5",
    measurementId: "G-XXXXXXXXXX"
  };

  constructor() {
    this.checkSupport();
  }

  private checkSupport() {
    // Check if service worker and notifications are supported
    const supported = 'serviceWorker' in navigator && 'Notification' in window;
    this.isSupported.set(supported);
  }

  /**
   * Initialize Firebase Messaging
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Initialize Firebase if not already initialized
      if (!this.firebaseApp) {
        this.firebaseApp = initializeApp(this.firebaseConfig);
      }

      // Get messaging instance
      this.messaging = getMessaging(this.firebaseApp);

      // Setup message listener
      this.setupMessageListener();

      return true;
    } catch (error) {
      console.error('FCM initialization error:', error);
      return false;
    }
  }

  /**
   * Request notification permission and get FCM token
   */
  async requestPermission(): Promise<string | null> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      this.hasPermission.set(permission === 'granted');

      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      // Initialize messaging
      await this.initialize();

      if (!this.messaging) {
        throw new Error('Messaging not initialized');
      }

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: 'YOUR_VAPID_KEY' // TODO: Add your VAPID key from Firebase Console
      });

      if (token) {
        this.fcmToken.set(token);
        console.log('FCM Token:', token);
        
        // Save token to database
        await this.saveTokenToDatabase(token);
        
        return token;
      }

      return null;
    } catch (error) {
      console.error('Permission request error:', error);
      return null;
    }
  }

  /**
   * Save FCM token to admin_tokens table
   */
  private async saveTokenToDatabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        console.warn('No user logged in');
        return;
      }

      // Insert or update token
      const { error } = await this.supabase
        .from('admin_tokens')
        .upsert({
          user_id: user.id,
          fcm_token: token,
          platform: 'web',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving token:', error);
      } else {
        console.log('Token saved to database');
      }
    } catch (error) {
      console.error('Save token error:', error);
    }
  }

  /**
   * Setup listener for foreground messages
   */
  private setupMessageListener() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Message received:', payload);

      const notification: PushNotification = {
        title: payload.notification?.title || 'Nueva Alerta',
        body: payload.notification?.body || '',
        icon: payload.notification?.icon,
        data: payload.data
      };

      this.lastNotification.set(notification);

      // Show browser notification
      this.showNotification(notification);
    });
  }

  /**
   * Show browser notification
   */
  private showNotification(notification: PushNotification) {
    if (!this.hasPermission()) return;

    try {
      const notif = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        tag: 'zarx-alert',
        requireInteraction: true
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
        
        // Navigate to dispatch console if data contains alert_id
        if (notification.data?.alert_id) {
          window.location.href = `/admin/dispatch`;
        }
      };
    } catch (error) {
      console.error('Show notification error:', error);
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(): Promise<void> {
    const testNotif: PushNotification = {
      title: '🚨 Test de Notificación',
      body: 'El sistema de notificaciones está funcionando correctamente',
      icon: '/assets/icons/icon-192x192.png'
    };

    this.showNotification(testNotif);
  }

  /**
   * Delete token from database
   */
  async deleteToken(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) return;

      await this.supabase
        .from('admin_tokens')
        .delete()
        .eq('user_id', user.id);

      this.fcmToken.set(null);
      this.hasPermission.set(false);
    } catch (error) {
      console.error('Delete token error:', error);
    }
  }
}
