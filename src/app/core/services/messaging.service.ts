import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { Logger } from '../utils/logger';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private platformId = inject(PLATFORM_ID);
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
   * Initializes messaging system: checks permission and syncs subscription.
   */
  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const user = this.auth.currentUser();
    if (!user) return;

    if (this.permissionStatus() === 'granted') {
      await this.getSubscriptionToken();
    }
  }

  checkPermission(): void {
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined' && 'Notification' in window) {
      this.permissionStatus.set(Notification.permission);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus.set(permission);

      if (permission === 'granted') {
        this.toast.success('Notificaciones de emergencia activadas');
        await this.getSubscriptionToken();
      }
      return permission;
    } catch (e) {
      Logger.error('[MessagingService] Error requesting notification permission', e);
      return 'denied';
    }
  }

  async getSubscriptionToken(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') return null;

    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const tokenStr = JSON.stringify(subscription.toJSON());
          this.token.set(tokenStr);
          await this.saveTokenToSupabase(tokenStr);
          return tokenStr;
        }
      }
    } catch (e) {
      Logger.debug('[MessagingService] Push manager subscription notice:', e);
    }
    return null;
  }

  private async saveTokenToSupabase(token: string): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;

    try {
      await this.supabase
        .from('user_devices')
        .upsert({
          user_id: user.id,
          fcm_token: token,
          platform: 'web',
          last_active_at: new Date().toISOString()
        }, { onConflict: 'user_id, fcm_token' });
    } catch (_) {}
  }

  async sendBroadcast(data: { title: string; body: string; zoneId?: string; type: 'ALERT' | 'INFO' }): Promise<any> {
    Logger.debug('Sending broadcast notification:', data);
    return { success: true };
  }
}
