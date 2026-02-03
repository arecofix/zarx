import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { LocationService } from './location.service';
import { Alert, ReportType } from '../models';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { AppConstants } from '../constants/app.constants';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private supabase = inject(SupabaseService).client;
  private auth = inject(AuthService);
  private location = inject(LocationService);
  private toast = inject(ToastService);

  // Signals
  activeAlerts = signal<Alert[]>([]);
  isSending = signal(false);
  
  // Audio for Siren
  private sirenAudio: HTMLAudioElement | null = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof Audio !== 'undefined') {
      try {
        this.sirenAudio = new Audio(AppConstants.ASSETS.AUDIO.SIREN);
        this.sirenAudio.load();
      } catch (error) {
        console.warn('Audio initialization failed:', error);
      }
    }
  }

  /**
   * TRIGGER REPORT (Generic)
   */
  async sendAlert(type: ReportType, description?: string, evidenceUrl?: string): Promise<Alert | null> {
    if (this.isSending()) return null; // Prevent double click
    this.isSending.set(true);

    try {
      const user = this.auth.currentUser();
      // Allow anonymous reports? For now assume auth required as per previous logic
      if (!user) throw new Error('Debes iniciar sesión para reportar.');

      // 1. Get Location (High Accuracy)
      const pos = await this.location.getCurrentPosition();
      if (!pos) throw new Error('No se pudo obtener tu ubicación. Activa el GPS.');
      
      const { latitude, longitude } = pos.coords;

      // 2. Determine Priority
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
      if (type === ReportType.SOS || type === ReportType.PANIC) priority = 'CRITICAL';
      if (type === ReportType.FIRE || type === ReportType.MEDICAL) priority = 'HIGH';
      if (type === ReportType.NO_LIGHT || type === ReportType.POTHOLE) priority = 'LOW';

      // 3. Insert Alert
      const alertPayload = {
        user_id: user.id,
        type: type,
        priority: priority,
        status: 'OPEN',
        location: `POINT(${longitude} ${latitude})`,
        latitude: latitude,
        longitude: longitude,
        description: description || `Reporte de ${type}`,
        evidence_url: evidenceUrl
      };

      const { data, error } = await this.supabase
        .from('alerts')
        .insert(alertPayload)
        .select()
        .single();

      if (error) throw error;

      // 4. Success Loop
      this.safeHaptics(NotificationType.Success);
      this.toast.success(`✅ Alerta Enviada - Ayuda en camino`);
      
      return data as Alert;

    } catch (error: any) {
      console.error('Error sending alert:', error);
      this.toast.error(error.message || 'Error al enviar alerta. Intente nuevamente.');
      this.safeHaptics(NotificationType.Error);
      return null;
    } finally {
      this.isSending.set(false);
    }
  }

  /**
   * REALTIME MONITORING (Admin)
   */
  startMonitoring() {
    this.supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert = payload.new as Alert;
          this.handleNewAlert(newAlert);
        }
      )
      .subscribe();
      
    // Load initial active alerts
    this.fetchActiveAlerts();
  }

  stopMonitoring() {
    this.supabase.removeChannel(this.supabase.channel('admin-alerts'));
  }

  private async fetchActiveAlerts() {
    const { data } = await this.supabase
      .from('alerts')
      .select('*')
      .in('status', ['OPEN', 'ENGAGED'])
      .order('created_at', { ascending: false });
      
    if (data) {
      this.activeAlerts.set(data as Alert[]);
    }
  }

  private handleNewAlert(alert: Alert) {
    // 1. Update State
    this.activeAlerts.update(list => [alert, ...list]);

    // 2. Play Siren
    this.playSiren();

    // 3. Show Visual Feedback
    this.toast.info(`ALERTA: ${alert.type} detectada!`, 5000);
  }

  private playSiren() {
    if (this.sirenAudio) {
      this.sirenAudio.play().catch(e => console.warn('Audio play failed', e));
    }
  }

  private async safeHaptics(type: NotificationType) {
    try {
      await Haptics.notification({ type });
    } catch (e) {
      // Ignore if haptics not available
    }
  }
}
