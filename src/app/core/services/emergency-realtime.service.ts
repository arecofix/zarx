import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocationService } from './location.service';
import { ToastService } from './toast.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { SosService } from './sos.service';

@Injectable({
  providedIn: 'root'
})
export class EmergencyRealtimeService {
  private supabase = inject(SupabaseService).client;
  private location = inject(LocationService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private sosService = inject(SosService);

  private broadcastChannel: RealtimeChannel | null = null;
  private trackingInterval: any;

  // Active Emergency State
  activeEmergencyId = signal<string | null>(null);
  isRescuer = signal(false);

  constructor() {
    this.initBroadcastListener();
  }

  // 1. Listen for Broadcasts (Low Latency)
  private initBroadcastListener() {
    // Global channel for emergency broadcasts
    this.broadcastChannel = this.supabase.channel('emergency-broadcast');

    this.broadcastChannel
      .on('broadcast', { event: 'SOS_ALERT' }, async (payload) => {
         console.log('🚨 SOS BROADCAST RECEIVED:', payload);
         await this.handleEmergencyBroadcast(payload['payload']);
      })
      .subscribe((status) => {
         if (status === 'SUBSCRIBED') {
            console.log('✅ Connected to Emergency Broadcast Network');
         }
      });
  }

  // 2. Handle Incoming SOS
  private async handleEmergencyBroadcast(data: any) {
     /* 
       Payload: { 
         alert_id: string, 
         victim_id: string, 
         lat: number, 
         lng: number 
       } 
     */
     const pos = await this.location.getCurrentPosition();
     if (!pos) return;

     const dist = this.calculateDistance(
        pos.coords.latitude, 
        pos.coords.longitude,
        data.lat,
        data.lng
     );

     if (dist <= 500) {
        // ACTIVATE RESCUE MODE
        this.activeEmergencyId.set(data.alert_id);
        this.sosService.activateLocalEmergency(); // Hijack UI logic
        
        // Show Overlay / Notification
        this.toast.error(`🚨 SOS CERCANO (${dist.toFixed(0)}m) - ALGUIEN NECESITA AYUDA`);
        
        // Vibrate to wake up
        if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);
     }
  }

  // 3. Victim: Start Broadcasting Tracking
  startLiveTracking(emergencyId: string) {
    if (this.trackingInterval) clearInterval(this.trackingInterval);
    
    this.trackingInterval = setInterval(async () => {
       const pos = this.location.currentPosition(); // Signals are instant
       if (pos) {
          // Send to DB (for persistence/history)
          await this.supabase.from('emergency_tracking').insert({
             emergency_id: emergencyId,
             user_id: (await this.supabase.auth.getUser()).data.user?.id,
             latitude: pos.coords.latitude,
             longitude: pos.coords.longitude,
             timestamp: new Date().toISOString(),
             accuracy: pos.coords.accuracy,
             speed: pos.coords.speed,
             heading: pos.coords.heading
          });

          // Also Broadcast for live maps (faster)
          this.broadcastChannel?.send({
             type: 'broadcast',
             event: 'TRACKING_UPDATE',
             payload: {
                emergency_id: emergencyId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
             }
          });
       }
    }, 5000); // Every 5 seconds
  }

  stopTracking() {
     if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
     }
  }

  // Helper
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371e3; 
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c;
  }
}
