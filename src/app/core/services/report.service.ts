import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocationService } from './location.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { ReportType } from '../models'; // Ensure Alert/Report models are compatible
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Report {
  id: string;
  user_id: string;
  type: ReportType;
  description: string;
  status: 'PENDING' | 'VALIDATED' | 'FALSE_ALARM' | 'RESOLVED';
  location: any;
  latitude?: number;
  longitude?: number;
  evidence_url?: string;
  created_at: string;
  profiles?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private supabase = inject(SupabaseService).client;
  private location = inject(LocationService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  // State
  isUploading = signal(false);
  isSending = signal(false);
  recentReports = signal<Report[]>([]);

  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {}

  /**
   * Main method to create a report (formerly AlertService.sendAlert)
   */
  async createReport(type: ReportType, description: string, evidenceBlob?: Blob | null): Promise<boolean> {
    if (this.isSending()) return false;
    this.isSending.set(true);

    try {
      const user = this.auth.currentUser();
      if (!user) throw new Error('Debes iniciar sesión para reportar.');

      // 1. Get Location (Robust Handling)
      let pos;
      try {
        // First try manual selection (Map pin)
        pos = this.location.manualPosition();
        
        // If no manual pin, try GPS
        if (!pos) {
          pos = await this.location.getCurrentPosition();
        }
      } catch (locError: any) {
        console.warn('GPS Error:', locError);
        // Fallback or User prompt guidance
        throw new Error('📍 No se pudo obtener ubicación. Por favor: \n1. Activa el GPS \n2. Permite el acceso al navegador \n3. O selecciona la ubicación en el mapa manualmente.');
      }

      if (!pos) throw new Error('Ubicación requerida. Activa el GPS o marca el punto en el mapa.');
      
      const { latitude, longitude } = pos.coords;

      // 2. Upload Evidence (if any)
      let evidenceUrl: string | undefined;
      if (evidenceBlob) {
        const url = await this.uploadEvidence(evidenceBlob);
        if (url) evidenceUrl = url;
      }

      // 3. Determine Priority
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
      if (type === ReportType.SOS || type === ReportType.RIESGO_VIDA) priority = 'CRITICAL';
      if (type === ReportType.ROBO || type === ReportType.DELITO_PROCESO || type === ReportType.ACTIVIDAD_DELICTIVA) priority = 'CRITICAL';
      if (type === ReportType.INCENDIO || type === ReportType.EMERGENCIA_MEDICA || type === ReportType.ACCIDENTE) priority = 'HIGH';
      if (type === ReportType.ACTIVIDAD_SOSPECHOSA || type === ReportType.VANDALISMO) priority = 'MEDIUM';
      if (type === ReportType.CORTE_DE_LUZ || type === ReportType.LUMINARIA_ROTA || type === ReportType.BACHE || type === ReportType.BASURA || type === ReportType.PELIGRO_VIAL || type === ReportType.PELIGRO_VIAL_OBSTRUCCION) priority = 'LOW';

      // 3. Insert into Database
      const payload = {
        user_id: user.id,
        type: type,
        priority: priority,
        description: description || `Reporte de ${type}`,
        status: 'PENDING',
        location: `POINT(${longitude} ${latitude})`, // PostGIS
        latitude: latitude,      // ✅ Required for queries
        longitude: longitude,    // ✅ Required for queries
        evidence_url: evidenceUrl
      };

      console.log('📤 Sending report:', { type, priority, lat: latitude, lng: longitude });

      const { data, error } = await this.supabase
        .from('reports')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // 4. Success Feedback
      this.toast.success('✅ Reporte enviado correctamente');
      this.safeHaptics(NotificationType.Success);
      
      return true;

    } catch (error: any) {
      console.error('Error creating report:', error);
      this.toast.error(error.message || 'Error al enviar reporte.');
      this.safeHaptics(NotificationType.Error);
      return false;
    } finally {
      this.isSending.set(false);
      this.isUploading.set(false);
    }
  }

  /**
   * Upload Logic
   */
  private async uploadEvidence(file: Blob): Promise<string | null> {
    try {
      this.isUploading.set(true);
      const fileName = `evidence_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const { error } = await this.supabase.storage
        .from('evidence')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data } = this.supabase.storage.from('evidence').getPublicUrl(fileName);
      return data.publicUrl;

    } catch (e) {
      console.warn('Evidence upload failed', e);
      return null;
    }
  }

  private async safeHaptics(type: NotificationType) {
    if (Capacitor.isNativePlatform()) {
      try { await Haptics.notification({ type }); } catch (e) {}
    }
  }

  /**
   * realtime / Fetch logic can be expanded here if needed by consumers
   */
  /**
   * Proximity feed logic
   */
  async getNearbyReports(lat: number, lon: number, radiusMeters: number = 2000): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('get_alerts_in_radius', {
      user_lat: lat,
      user_lon: lon,
      radius_meters: radiusMeters
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Neighbor Validation (Validación Vecinal)
   */
  async validateReport(reportId: string): Promise<boolean> {
    const user = this.auth.currentUser();
    if (!user) return false;

    try {
      // In a real system, this would insert into a validations table
      // and update the score of the reporter.
      // For now, we'll just track it via RPC or metadata if available.
      const { error } = await this.supabase.rpc('validate_neighbor_report', {
        target_report_id: reportId,
        validator_id: user.id
      });

      if (error) throw error;
      
      this.toast.success('✅ Validación vecinal registrada');
      return true;
    } catch (e) {
      console.error(e);
      this.toast.error('No se pudo validar el reporte');
      return false;
    }
  }

  async fetchUserRecentReports() {
      // Implementation for history if needed
  }

  async getHeatmapData(): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('get_heatmap_data');
    if (error) {
      console.warn('Heatmap fetch failed:', error);
      return []; 
    }
    return data || [];
  }
}
