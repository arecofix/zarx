import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocationService } from './location.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { AppConstants } from '../constants/app.constants';
import { ReportType } from '../models';

// Domain Entity / Command
export interface SosCommand {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class SosService {
  private supabase = inject(SupabaseService).client;
  private location = inject(LocationService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  // State
  isSending = signal(false);
  emergencyActive = signal<{isActive: boolean, victimId?: string, coords?: any}>({ isActive: false });

  /**
   * USE CASE: SEND SOS
   * Orchestrates the high-priority emergency reporting flow.
   */
  private getFallbackLocation(): SosCommand {
     // Intenta obtener una ubicación aproximada o por defecto para no bloquear el SOS
     return {
        userId: this.auth.currentUser()?.id || 'anon',
        latitude: AppConstants.CONFIG.LOCATION.DEFAULT_LAT,
        longitude: AppConstants.CONFIG.LOCATION.DEFAULT_LNG,
        accuracy: 5000,
        timestamp: Date.now()
     };
  }

  /**
   * USE CASE: SEND SOS
   * Orchestrates the high-priority emergency reporting flow.
   */
  async triggerSos(): Promise<boolean> {
    if (this.isSending()) return false;
    this.isSending.set(true);

    try {
      // 1. Validate Session
      const user = this.auth.currentUser();
      if (!user) {
         throw new Error('Usuario no identificado');
      }

      // 2. Capture Critical Data (Location)
      this.toast.info('Obteniendo ubicación precisa...');
      let pos;
      let usedFallback = false;

      try {
        pos = await this.location.getCurrentPosition(); 
      } catch (e) {
        console.warn('GPS fail, falling back to manual/last known');
        pos = this.location.manualPosition() as any;
      }

      // FAILSAFE: If location totally fails, DO NOT BLOCK SOS. Use fallback.
      if (!pos || !pos.coords) {
         console.error('CRITICAL: GPS failed completely. Using fallback coordinates.');
         const fallback = this.getFallbackLocation();
         pos = {
            coords: {
               latitude: fallback.latitude,
               longitude: fallback.longitude,
               accuracy: fallback.accuracy
            }
         };
         usedFallback = true;
      }

      const command: SosCommand = {
        userId: user.id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: Date.now()
      };

      // 3. Send with Robust Policy (Recursive Retry)
      // Add description note if fallback
      const desc_prefix = usedFallback ? '[UBICACIÓN APROX/ERROR GPS] ' : '';
      await this.sendWithRetry(command, desc_prefix);

      // 4. Update UI State (Success)
      this.activateLocalEmergency();
      this.toast.success('ALERTA ENVIADA - AYUDA EN CAMINO');
      return true;

    } catch (error: any) {
      console.error('SOS FAILED:', error);
      this.toast.error(`ERROR CRÍTICO: ${error.message}`);
      return false;
    } finally {
      this.isSending.set(false);
    }
  }

  /**
   * RECURSIVE RETRY STRATEGY (Exponential Backoff)
   * Ensures the packet reaches the server even with network jitter.
   */
  private async sendWithRetry(command: SosCommand, descPrefix: string = '', attempt = 1, maxAttempts = 5): Promise<void> {
    try {
      console.log(`SOS Attempt ${attempt}/${maxAttempts}`);
      
      const { error } = await this.supabase.from('emergencies').insert({
        user_id: command.userId,
        // type: ReportType.SOS, // Not needed in new table
        status: 'pending', // Enum
        // priority: 'CRITICAL', // Implicit
        latitude: command.latitude,   
        longitude: command.longitude, 
        // location: `POINT(${command.longitude} ${command.latitude})`, // Not mandatory if lat/lng are columns
        // description: `${descPrefix}SOS DE MÁXIMA PRIORIDAD - Precisión: ${command.accuracy || 0}m` // Removed or stored elsewhere? Use dedicated field?
      });

      if (error) throw error;
      
    } catch (err) {
      if (attempt >= maxAttempts) {
        throw new Error('No se pudo conectar con el centro de mando tras múltiples intentos.');
      }

      // Exponential Backoff: 1s, 2s, 4s, 8s...
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.sendWithRetry(command, descPrefix, attempt + 1, maxAttempts);
    }
  }

  // --- UI Helpers ---

  activateLocalEmergency() {
    this.emergencyActive.set({ isActive: true });
  }

  deactivateLocalEmergency() {
    this.emergencyActive.set({ isActive: false });
  }

  setVictimTarget(victimId: string, coords: {lat: number, lng: number}) {
     this.emergencyActive.set({ 
        isActive: true, 
        victimId,
        coords
     });
  }
}
