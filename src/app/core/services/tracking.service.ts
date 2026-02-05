import { Injectable, inject, signal, effect, Injector } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { LocationService } from './location.service';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private supabase = inject(SupabaseService).client;
  private auth = inject(AuthService);
  private location = inject(LocationService);
  
  // State
  activeSessionId = signal<string | null>(null);
  isTracking = signal(false);
  
  constructor(private injector: Injector) {
    // Sync Location to DB whenever it changes IF we have an active session
    effect(() => {
      const pos = this.location.currentPosition();
      const sessionId = this.activeSessionId();
      
      if (pos && sessionId) {
        this.syncPosition(sessionId, pos.coords.latitude, pos.coords.longitude);
      }
    }, { injector: this.injector });
  }

  /**
   * START SESSION
   */
  async startSession(): Promise<string | null> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Ensure Tracking is On
    await this.location.startTracking();
    const pos = await this.location.getCurrentPosition();
    
    if (!pos) throw new Error('No GPS fix available');

    // 2. Insert DB Row
    const { data, error } = await this.supabase
      .from('active_tracking_sessions')
      .insert({
        user_id: user.id,
        current_lat: pos.coords.latitude,
        current_lng: pos.coords.longitude,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
       console.error('Start session error', error);
       return null;
    }
    
    this.activeSessionId.set(data.id);
    this.isTracking.set(true);
    
    return data.id;
  }

  /**
   * STOP SESSION
   */
  async stopSession() {
    const id = this.activeSessionId();
    // Stop local GPS loop
    await this.location.stopTracking(); 

    if (!id) return;

    // Update DB
    await this.supabase
      .from('active_tracking_sessions')
      .update({ is_active: false })
      .eq('id', id);

    // Reset State
    this.activeSessionId.set(null);
    this.isTracking.set(false);
  }

  /**
   * INTERNAL: Sync to Supabase
   */
  private async syncPosition(sessionId: string, lat: number, lng: number) {
     const { error } = await this.supabase
       .from('active_tracking_sessions')
       .update({
         current_lat: lat,
         current_lng: lng
       })
       .eq('id', sessionId);
     
     if (error) console.error('Tracking update failed', error);
     else console.log('[Tracking] Synced to Cloud:', lat, lng);
  }
  
  getShareUrl(sessionId: string): string {
     return `${window.location.origin}/track/${sessionId}`;
  }
}
