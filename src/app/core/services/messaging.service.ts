import { Injectable, inject, signal } from '@angular/core';
import { getToken, onMessage, Messaging } from '@angular/fire/messaging';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private messaging = inject(Messaging);
  private supabase = inject(SupabaseService).client;
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  currentMessage = signal<any>(null);
  token = signal<string | null>(null);
  permissionStatus = signal<NotificationPermission>('default');

  constructor() {
    this.checkPermission();
  }

  checkPermission() {
    if ('Notification' in window) {
      this.permissionStatus.set(Notification.permission);
    }
  }

  async requestPermission() {
    try {
      if (!('Notification' in window)) {
        this.toast.error('Este navegador no soporta notificaciones.');
        return;
      }

      const permission = await Notification.requestPermission();
      this.permissionStatus.set(permission);

      if (permission === 'granted') {
        await this.getToken();
      } else {
        this.toast.info('Notificaciones bloqueadas. No recibirás alertas críticas.');
      }
    } catch (e) {
      console.error('Error requesting permission', e);
    }
  }

  async getToken() {
    try {
      const currentToken = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey // Ensure this exists in environment
      });

      if (currentToken) {
        this.token.set(currentToken);
        await this.saveTokenToProfile(currentToken);
        this.listenForMessages();
      } else {
        console.warn('No registration token available.');
      }
    } catch (e) {
      console.error('An error occurred while retrieving token. ', e);
    }
  }

  private async saveTokenToProfile(token: string) {
    const user = this.auth.currentUser();
    if (!user) return;

    const { error } = await this.supabase.rpc('update_fcm_token', { token });
    if (error) {
      console.error('Error saving FCM token to profile:', error);
    } else {
      console.log('FCM Token saved to profile');
    }
  }

  listenForMessages() {
    onMessage(this.messaging, (payload) => {
      console.log('Message received. ', payload);
      this.currentMessage.set(payload);
      
      // Foreground notification visual
      this.toast.info(`${payload.notification?.title}: ${payload.notification?.body}`);
    });
  }

  // --- Broadcast Logic (Admin) ---
  
  async sendBroadcast(data: { title: string, body: string, zoneId?: string, type: 'ALERT' | 'INFO' }) {
    // Call Edge Function
    const { data: result, error } = await this.supabase.functions.invoke('send-broadcast-notification', {
      body: data
    });

    if (error) throw error;
    return result;
  }
}
