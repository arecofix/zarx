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
  private urgentSirenAudio: HTMLAudioElement | null = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof Audio !== 'undefined') {
      try {
        this.sirenAudio = new Audio(AppConstants.ASSETS.AUDIO.SIREN);
        this.sirenAudio.load();

        this.urgentSirenAudio = new Audio(AppConstants.ASSETS.AUDIO.URGENT_SIREN);
        this.urgentSirenAudio.load();
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

      // 1. Get Location (High Accuracy or Manual Pin)
      let pos = this.location.manualPosition();
      
      if (!pos) {
        pos = await this.location.getCurrentPosition();
      }

      if (!pos) throw new Error('No se pudo obtener tu ubicación. Activa el GPS o marca el mapa.');
      
      const { latitude, longitude } = pos.coords;

      // 2. Determine Priority
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
      if (type === ReportType.SOS || type === ReportType.RIESGO_VIDA) priority = 'CRITICAL';
      if (type === ReportType.ROBO || type === ReportType.DELITO_PROCESO || type === ReportType.ACTIVIDAD_DELICTIVA) priority = 'CRITICAL';
      if (type === ReportType.INCENDIO || type === ReportType.EMERGENCIA_MEDICA || type === ReportType.ACCIDENTE) priority = 'HIGH';
      if (type === ReportType.ACTIVIDAD_SOSPECHOSA || type === ReportType.VANDALISMO) priority = 'MEDIUM';
      if (type === ReportType.CORTE_DE_LUZ || type === ReportType.LUMINARIA_ROTA || type === ReportType.BACHE || type === ReportType.BASURA || type === ReportType.PELIGRO_VIAL || type === ReportType.PELIGRO_VIAL_OBSTRUCCION) priority = 'LOW';

      // 3. Insert Alert
      const alertPayload = {
        user_id: user.id,
        type: type,
        priority: priority,
        status: 'PENDING',
        location: `POINT(${longitude} ${latitude})`,
        latitude: latitude,
        longitude: longitude,
        description: description || `Reporte de ${type}`,
        evidence_url: evidenceUrl
      };

      const { data, error } = await this.supabase
        .from('reports')
        .insert(alertPayload)
        .select()
        .single();

      if (error) throw error;

      // 4. Success Loop
      this.safeHaptics(NotificationType.Success);
      this.toast.success(`✅ Reporte Enviado`);
      
      return data as Alert;

    } catch (error: any) {
      console.error('Error sending report:', error);
      this.toast.error(error.message || 'Error al enviar reporte. Intente nuevamente.');
      this.safeHaptics(NotificationType.Error);
      return null;
    } finally {
      this.isSending.set(false);
    }
  }

  // Signal exposed for global feedback
  isLoading = signal(false);

  /**
   * UPDATE ALERT STATUS (Admin) - Command Pattern
   */
  async updateAlertStatus(command: { 
    id: string, 
    status: Alert['status'], 
    userId?: string, // To notify
    adminId?: string // Audit
  }): Promise<boolean> {
    const { id, status, userId } = command;

    if (this.isLoading()) return false;
    this.isLoading.set(true);

    try {
      // 1. Atomic DB Update
      const { error } = await this.supabase
        .from('reports')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // 2. Notify User (Side Effect)
      if (userId) {
        await this.notifyUserStatusChange(userId, status, id);
      }

      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      this.toast.error('Error al actualizar estado');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  private async notifyUserStatusChange(userId: string, status: string, reportId: string) {
    let title = 'Actualización de Reporte';
    let message = `Tu reporte ha sido actualizado a: ${status}`;
    let type: 'info' | 'success' | 'warning' | 'error' = 'info';

    switch (status) {
      case 'VALIDATED':
      case 'VERIFIED':
        title = '✅ Reporte Verificado';
        message = 'Tu reporte ha sido verificado por las autoridades.';
        type = 'success';
        break;
      case 'FALSE_ALARM':
        title = '⚠️ Falsa Alarma';
        message = 'Tu reporte ha sido marcado como falsa alarma.';
        type = 'warning';
        break;
      case 'RESOLVED':
        title = '🎉 Caso Cerrado';
        message = 'La situación ha sido resuelta.';
        type = 'success';
        break;
    }

    await this.supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      metadata: { report_id: reportId }
    });
  }

  /**
   * REALTIME MONITORING (Admin)
   */
  startMonitoring() {
    this.supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
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
      .from('reports')
      .select('*, profiles:user_id(id, full_name, avatar_url, phone, username, role)')
      .in('status', ['PENDING', 'VALIDATED', 'VERIFIED', 'ENGAGED', 'OPEN'])
      .order('created_at', { ascending: false });
      
    if (data) {
      this.activeAlerts.set(data as Alert[]);
    }
  }

  private handleNewAlert(alert: Alert) {
    // 1. Update State
    this.activeAlerts.update(list => [alert, ...list]);

    // 2. Play Siren
    this.playSiren(alert.type);

    // 3. Show Visual Feedback
    this.toast.info(`ALERTA: ${alert.type} detectada!`, 5000);
  }

  private playSiren(type?: string) {
    if (type === ReportType.RIESGO_VIDA && this.urgentSirenAudio) {
      this.urgentSirenAudio.play().catch(e => console.warn('Urgent Audio play failed', e));
    } else if (this.sirenAudio) {
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
