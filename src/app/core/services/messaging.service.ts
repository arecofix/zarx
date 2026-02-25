import { Injectable, inject, signal } from '@angular/core';
import { getToken, onMessage, Messaging } from '@angular/fire/messaging';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
import { Logger } from '../utils/logger';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private messaging = inject(Messaging, { optional: true });
  private supabase = inject(SupabaseService).client;
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  currentMessage = signal<any>(null);
  token = signal<string | null>(null);
  permissionStatus = signal<NotificationPermission>('default');

  constructor() {
    this.checkPermission();
  }

  /**
   * Initializes messaging system: requests permission and setup listeners.
   * This replaces the old NotificationSetupService.
   */
  async init() {
    const user = this.auth.currentUser();
    if (!user) return;

    if (this.permissionStatus() === 'granted') {
      await this.getToken();
    } else if (this.permissionStatus() === 'default') {
      // Don't auto-ask on every page load to avoid annoyance, 
      // but App.init calls this, so we follow that flow.
      await this.requestPermission();
    }
  }

  checkPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permissionStatus.set(Notification.permission);
    }
  }

  async requestPermission() {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
      }

      const permission = await Notification.requestPermission();
      this.permissionStatus.set(permission);

      if (permission === 'granted') {
        await this.getToken();
      }
    } catch (e) {
      Logger.error('Error requesting notification permission', e);
    }
  }

  async getToken() {
    if (typeof window === 'undefined' || !this.messaging) return;
    
    try {
      const currentToken = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey
      });

      if (currentToken) {
        this.token.set(currentToken);
        await this.saveTokenToSupabase(currentToken);
        this.listenForMessages();
      } else {
        Logger.warn('No registration token available.');
      }
    } catch (e) {
      Logger.error('An error occurred while retrieving token.', e);
    }
  }

  private async saveTokenToSupabase(token: string) {
    const user = this.auth.currentUser();
    if (!user) return;

    // 1. Try upsert to user_devices (Modern approach)
    const { error: upsertError } = await this.supabase
      .from('user_devices')
      .upsert({
        user_id: user.id,
        fcm_token: token,
        platform: 'web',
        last_active_at: new Date()
      }, { onConflict: 'user_id, fcm_token' });

    if (upsertError) {
      Logger.warn('Upsert to user_devices failed, trying RPC update_fcm_token', upsertError.message);
      
      // 2. Fallback to RPC (Legacy or Specific project pattern)
      const { error: rpcError } = await this.supabase.rpc('update_fcm_token', { token });
      if (rpcError) {
        Logger.error('RPC update_fcm_token also failed', rpcError.message);
      }
    } else {
      Logger.debug('FCM Token saved successfully to user_devices');
    }
  }

  listenForMessages() {
    if (!this.messaging) return;
    
    onMessage(this.messaging, (payload) => {
      Logger.debug('Message received:', payload);
      this.currentMessage.set(payload);
      
      // Foreground notification visual feedback
      if (payload.notification) {
        this.toast.info(`${payload.notification.title}: ${payload.notification.body}`, 6000);
      }
    });
  }

  // --- Broadcast Logic (Admin) ---
  
  async sendBroadcast(data: { title: string, body: string, zoneId?: string, type: 'ALERT' | 'INFO' }) {
    Logger.debug('Sending broadcast notification:', data);
    
    const { data: result, error } = await this.supabase.functions.invoke('send-broadcast-notification', {
      body: data
    });

    if (error) {
      Logger.error('Error sending broadcast:', error);
      throw error;
    }
    return result;
  }
}
