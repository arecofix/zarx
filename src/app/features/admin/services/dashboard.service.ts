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
      
      // Attempt 1: Explicit Join with correct FK syntax
      let { data, error } = await this.supabase
        .from('reports')
        .select(`
          *,
          profiles:user_id(id, full_name, avatar_url, phone, username, role)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      // Attempt 2: Fallback if Join fails
      if (error || !data) {
        console.warn('Join failed, trying fallback fetch...');
        const { data: simpleData, error: simpleError } = await this.supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (simpleError) throw simpleError;
        
        if (simpleData) {
          // Fetch profiles separately for these reports
          const userIds = simpleData.map(r => r.user_id);
          const { data: profData } = await this.supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone')
            .in('id', userIds);
          
          data = simpleData.map(r => ({
            ...r,
            profiles: profData?.find(p => p.id === r.user_id) || null
          }));
        }
      }

      if (data) {
        const alerts = data.map((alert: any) => {
           const profileData = Array.isArray(alert.profiles) ? alert.profiles[0] : alert.profiles;
           
           let lat = alert.latitude; 
           let lng = alert.longitude;
           
           if (!lat && alert.location) {
              if (typeof alert.location === 'object' && alert.location.coordinates) {
                  [lng, lat] = alert.location.coordinates;
              } else if (typeof alert.location === 'string' && alert.location.startsWith('POINT')) {
                  const parts = alert.location.replace('POINT(', '').replace(')', '').split(' ');
                  if (parts.length === 2) {
                      lng = parseFloat(parts[0]);
                      lat = parseFloat(parts[1]);
                  }
              }
           }

           return {
             ...alert,
             latitude: lat,
             longitude: lng,
             profiles: profileData
           };
        });
        this.incomingAlerts.set(alerts);
      }
    } catch (error) {
      console.error('Fatal error fetching alerts:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Subscribe to new incoming reports
   */
  subscribeToAlerts() {
    if (this.subscription) return;

    this.subscription = this.supabase
      .channel('dashboard-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        async (payload) => {
          const newId = payload.new['id'];
          await this.fetchAndPrependAlert(newId);
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
        .from('reports')
        .select(`
          *,
          profiles:user_id ( full_name, avatar_url, phone )
        `)
        .eq('id', alertId)
        .single();
        
      if (data) {
        const profileData = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
        
        // Manual Location Parse
        let lat = (data as any).latitude;
        let lng = (data as any).longitude;
        const loc = (data as any).location;

        if (!lat && loc) {
            if (typeof loc === 'object' && loc.coordinates) {
                [lng, lat] = loc.coordinates;
            } else if (typeof loc === 'string' && loc.startsWith('POINT')) {
                const parts = loc.replace('POINT(', '').replace(')', '').split(' ');
                if (parts.length === 2) {
                    lng = parseFloat(parts[0]);
                    lat = parseFloat(parts[1]);
                }
            }
        }

        const normalized = { 
            ...data, 
            latitude: lat,
            longitude: lng,
            profiles: profileData 
        };

        this.incomingAlerts.update(current => [normalized as any, ...current]);
        this.playSound();
      }
    } catch (error) {
      console.error('Error fetching new report details:', error);
    }
  }

  /**
   * Action: Verify/Resolve Alert with Feedback
   */
  async verifyAlert(alertId: string, status: 'RESOLVED' | 'FALSE_ALARM' | 'ENGAGED', feedback?: string) {
    // Optimistic Remove from Feed if Resolved/False
    if (status !== 'ENGAGED') {
       this.incomingAlerts.update(list => list.filter(a => a.id !== alertId));
    }

    // Map UI Status 'RESOLVED' (Button "Validar") to DB Status 'VALIDATED' (Triggers Points)
    // 'FALSE_ALARM' stays same.
    let dbStatus = status;
    if (status === 'RESOLVED') dbStatus = 'VALIDATED' as any;

    const updateData: any = { status: dbStatus };
    if (feedback) updateData.admin_feedback = feedback;

    const { error } = await this.supabase
      .from('reports')
      .update(updateData)
      .eq('id', alertId);

    if (error) {
      console.error('Error updating report status:', error);
    }
  }

  // Legacy wrapper
  async resolveAlert(alertId: string) {
    return this.verifyAlert(alertId, 'RESOLVED');
  }
}
