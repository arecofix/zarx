import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Alert } from '../../../core/models';
import { AppConstants } from '../../../core/constants/app.constants';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private supabase = inject(SupabaseService).client;
  
  // Signals
  incomingAlerts = signal<Alert[]>([]);
  isLoading = signal(false);

  private subscription: RealtimeChannel | null = null;
  private audio: HTMLAudioElement | null = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof Audio !== 'undefined') {
      try {
        // Use a distinct beep for admin feed
        this.audio = new Audio(AppConstants.ASSETS.AUDIO.ALERT_BEEP || 'assets/audio/beep.mp3'); 
        this.audio.load();
      } catch (error) {
        console.warn('Dashboard Audio init failed', error);
      }
    }
  }

  private playSound() {
    if (this.audio) {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    }
  }

  /**
   * Fetch initial alerts with user profile data
   */
  /**
   * Fetch initial alerts with user profile data
   */
  async getAlerts() {
    try {
      this.isLoading.set(true);
      
      // Attempt 1: Full Join
      const { data, error } = await this.supabase
        .from('alerts')
        .select(`
          *,
          profiles:user_id (*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
         console.warn('Advanced join failed, trying simplified fetch', error);
         throw error; // Trigger fallback
      }

      if (data) {
        // Normalize profiles data
        const alerts = data.map((alert: any) => {
           // Handle case where profile might be returned as single object or array
           const profileData = Array.isArray(alert.profiles) ? alert.profiles[0] : alert.profiles;
           return {
             ...alert,
             profiles: profileData
           };
        });
        this.incomingAlerts.set(alerts);
      }

    } catch (error) {
      console.error('Error fetching dashboard alerts (First Try):', error);
      
      // Fallback: Fetch alerts only (ignore profile join failures to ensure dashboard works)
      const { data: simpleData } = await this.supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (simpleData) {
         this.incomingAlerts.set(simpleData as any[]);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Subscribe to new incoming alerts
   */
  subscribeToAlerts() {
    if (this.subscription) return;

    this.subscription = this.supabase
      .channel('dashboard-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        async (payload) => {
          const newAlertId = payload.new['id'];
          // We need to fetch the full alert to get the profile association
          // because the INSERT payload only contains raw table data
          await this.fetchAndPrependAlert(newAlertId);
        }
      )
      .subscribe();
  }

  unsubscribe() {
    if (this.subscription) {
      this.supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
  }

  private async fetchAndPrependAlert(alertId: string) {
    try {
      const { data, error } = await this.supabase
        .from('alerts')
        .select(`
          *,
          profiles (*)
        `)
        .eq('id', alertId)
        .single();
        
      if (data) {
        // Prepend to signal
        this.incomingAlerts.update(current => [data as any, ...current]);
        
        // UX
        this.playSound();
      }
    } catch (error) {
      console.error('Error fetching new alert details:', error);
    }
  }

  /**
   * Action: Resolve/Archive Alert
   */
  async resolveAlert(alertId: string) {
    // Optimistic update
    this.incomingAlerts.update(list => list.filter(a => a.id !== alertId));

    const { error } = await this.supabase
      .from('alerts')
      .update({ status: 'RESOLVED' })
      .eq('id', alertId);

    if (error) {
      console.error('Error resolving alert:', error);
      // Revert if needed, but for MVP keep it simple
    }
  }
}
