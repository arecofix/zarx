import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ToastService } from './toast.service';
import { AudioService } from './audio.service';
import { Profile } from '../models';

export interface Emergency {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'viewed' | 'resolved' | 'false_alarm';
  created_at: string;
  
  // Hydrated Profile
  profile?: Profile;
}

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);
  private audio = inject(AudioService);

  // State
  activeEmergencies = signal<Emergency[]>([]);
  
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {}

  /**
   * Start listening for LIVE emergencies
   */
  startMonitoring() {
    this.fetchPendingEmergencies();
    this.subscribeToRealtime();
  }

  stopMonitoring() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private async fetchPendingEmergencies() {
    const { data, error } = await this.supabase
      .from('emergencies')
      .select(`
        *,
        profile:profiles!user_id ( id, full_name, phone, email, avatar_url )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching emergencies:', error);
      return;
    }

    // Map and hydrate
    const emergencies = (data || []).map((e: any) => this.mapEmergency(e));
    this.activeEmergencies.set(emergencies);
  }

  private subscribeToRealtime() {
    if (this.realtimeChannel) return;

    this.realtimeChannel = this.supabase.channel('emergencies-monitor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emergencies' },
        async (payload) => {
          console.log('🚨 NEW EMERGENCY DETECTED:', payload);
          await this.handleNewEmergency(payload.new);
        }
      )
      .subscribe();
  }

  private async handleNewEmergency(record: any) {
    // We need to fetch the profile details because realtime payload doesn't include joins
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, phone, email, avatar_url')
      .eq('id', record.user_id)
      .single();

    if (error) {
       console.error('Could not fetch victim profile', error);
    }

    const emergency: Emergency = {
      ...record,
      profile: data || { id: record.user_id, full_name: 'Desconocido' }
    };

    // Update State
    this.activeEmergencies.update(list => [emergency, ...list]);

    // Trigger Alarm
    this.audio.playUrgentSiren();
    this.toast.error(`🆘 EMERGENCIA: ${emergency.profile?.full_name || 'Radio Operador'}`);
  }

  async resolveEmergency(id: string) {
    const { error } = await this.supabase
      .from('emergencies')
      .update({ status: 'resolved' })
      .eq('id', id);

    if (!error) {
      this.activeEmergencies.update(list => list.filter(e => e.id !== id));
      this.toast.success('Emergencia resuelta');
    }
  }

  // Helper
  private mapEmergency(data: any): Emergency {
    // If profile is array (sometimes happens with joins depending on version), take first
    const profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;
    return {
      ...data,
      profile
    };
  }
}
