import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Report } from '../../../core/models';
import { AppConstants } from '../../../core/constants/app.constants';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private supabase = inject(SupabaseService).client;
  
  // Signals
  incomingAlerts = signal<Report[]>([]);
  isLoading = signal(false);

  private subscription: RealtimeChannel | null = null;
  private audio: HTMLAudioElement | null = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof Audio !== 'undefined') {
      try {
        this.audio = new Audio(AppConstants.ASSETS.AUDIO.ALERT_BEEP || 'assets/audio/beep.mp3'); 
        this.audio.load();
      } catch (error) {
        console.warn('Dashboard Audio init failed', error);
      }
    }
  }

  public playSound() {
    if (this.audio) {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    }
  }

  async getAlerts() {
    try {
      this.isLoading.set(true);
      
      let { data, error } = await this.supabase
        .from('reports')
        .select(`
          *,
          profiles:user_id(id, full_name, avatar_url, phone, username, role)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data) {
        console.warn('Join failed, trying fallback fetch...');
        const { data: simpleData, error: simpleError } = await this.supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (simpleError) throw simpleError;
        
        if (simpleData) {
          const userIds = simpleData.map((r: any) => r.user_id);
          const { data: profData } = await this.supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone')
            .in('id', userIds);
          
          data = simpleData.map((r: any) => ({
            ...r,
            profiles: profData?.find((p: any) => p.id === r.user_id) || null
          }));
        }
      }

      if (data) {
        const alerts = data.map((alert: any): Report => {
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
           } as Report;
        });
        this.incomingAlerts.set(alerts);
      }
    } catch (error) {
      console.error('Fatal error fetching alerts:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

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
        const reportData = data as any;
        const profileData = Array.isArray(reportData.profiles) ? reportData.profiles[0] : reportData.profiles;
        
        let lat = reportData.latitude;
        let lng = reportData.longitude;
        const loc = reportData.location;

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

        const normalized: Report = { 
            ...reportData, 
            latitude: lat,
            longitude: lng,
            profiles: profileData 
        };

        this.incomingAlerts.update(current => [normalized, ...current]);
        this.playSound();
      }
    } catch (error) {
      console.error('Error fetching new report details:', error);
    }
  }

  async verifyAlert(alertId: string, status: 'RESOLVED' | 'FALSE_ALARM' | 'ENGAGED', feedback?: string) {
    if (status !== 'ENGAGED') {
       this.incomingAlerts.update(list => list.filter(a => a.id !== alertId));
    }

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

  async resolveAlert(alertId: string) {
    return this.verifyAlert(alertId, 'RESOLVED');
  }
}
