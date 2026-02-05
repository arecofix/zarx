import { Injectable, inject } from '@angular/core';
import { getToken, Messaging } from '@angular/fire/messaging';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationSetupService {
  private messaging = inject(Messaging);
  private supabase = inject(SupabaseService).client;
  private auth = inject(AuthService);

  constructor() {}

  async requestPermissionAndSaveToken() {
    const user = this.auth.currentUser();
    if (!user) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: environment.firebase.vapidKey // Ensure this exists in your environment
        });

        if (token) {
          console.log('FCM Token:', token);
          await this.saveTokenToSupabase(user.id, token);
        }
      }
    } catch (error) {
      console.error('Unable to get permission/token', error);
    }
  }

  private async saveTokenToSupabase(userId: string, token: string) {
    // Upsert token
    const { error } = await this.supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        fcm_token: token,
        platform: 'web',
        last_active_at: new Date()
      }, { onConflict: 'user_id, fcm_token' });

    if (error) console.error('Error saving FCM token:', error);
  }
}
