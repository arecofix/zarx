import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocationService } from './location.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { Report, ReportType } from '../models'; // Unified Model
import { AppConstants } from '../constants/app.constants';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AudioService } from './audio.service';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private supabase = inject(SupabaseService).client;
  private location = inject(LocationService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private audio = inject(AudioService);

  // State
  isUploading = signal(false);
  isSending = signal(false);
  
  // Admin State - LIVE MODERATION (SOS / Critical)
  liveModerationQueue = signal<Report[]>([]); 
  
  // Admin State - HISTORY / VECINAL (Standard)
  historyLog = signal<Report[]>([]);
  
  isLoadingReports = signal(false);

  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {}

  // ==================================================================================
  // ADMIN & MODERATION METHODS (Query Chain)
  // ==================================================================================

  /**
   * Fetch all reports that need moderation (PENDING status)
   * Includes User Profile data.
   */
  async fetchPendingReports() {
    this.isLoadingReports.set(true);
    try {
      // 1. Fetch Initial Data
      const { data, error } = await this.supabase
        .from('reports')
        .select(`
          *,
          profiles:user_id ( id, full_name, avatar_url, phone, username, role )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const reports = (data || []).map(this.mapReportLocation);
      
      // Filter Initial Load
      const live = reports.filter(r => this.isCritical(r.type));
      const history = reports.filter(r => !this.isCritical(r.type));

      this.liveModerationQueue.set(live);
      this.historyLog.set(history);

      // 2. Start Realtime Subscription (Pattern: Observer)
      this.startRealtimeListener();

    } catch (error) {
      console.error('Error fetching reports:', error);
      this.toast.error('Error al cargar reportes pendientes.');
    } finally {
      this.isLoadingReports.set(false);
    }
  }

  private startRealtimeListener() {
    if (this.realtimeChannel) return;

    this.realtimeChannel = this.supabase.channel('admin-reports-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        async (payload) => {
           const newRecord = payload.new as any;
           
           // Discriminate by Type (Switch/If Logic requested)
           if (newRecord) {
              this.processIncomingReport(newRecord);
           }
        }
      )
      .subscribe((status) => {
         console.log('Realtime Subscription Status:', status);
      });
  }

  private async processIncomingReport(record: any) {
     // Fetch full details with profile
     const { data } = await this.supabase
        .from('reports')
        .select(`*, profiles:user_id ( id, full_name, avatar_url, phone, username, role )`)
        .eq('id', record.id)
        .single();
     
     if (data) {
        const report = this.mapReportLocation(data);
        
        // LOGIC: Discriminate Stream
        if (this.isCritical(report.type)) {
            // Flow A: SOS / Live Moderation
            this.handleLiveModeration(report);
        } else {
            // Flow B: History / Vecinal
            this.handleHistoryLog(report);
        }
     }
  }

  private handleLiveModeration(report: Report) {
      this.liveModerationQueue.update(prev => [report, ...prev]);
      
      // Critical Alert Logic
      this.safeHaptics(NotificationType.Success);
      this.audio.playUrgentSiren();
      this.toast.error(`🚨 ALERTA CRÍTICA: ${report.type} - ${report.profiles?.full_name || 'Usuario'}`);
  }

  private handleHistoryLog(report: Report) {
      this.historyLog.update(prev => [report, ...prev]);
      
      // Passive Notification
      this.toast.info(`📝 Nuevo reporte vecinal: ${report.type}`);
      // Maybe play a soft sound?
      this.audio.playBeep(); 
  }

  // Helper to determine stream
  private isCritical(type: string | ReportType): boolean {
      return type === 'SOS' || type === 'PANIC' || type === 'RIESGO_VIDA' || type === 'ROBO';
  }

  /**
   * Fetch ALL reports (History/Log) with pagination and filters
   */
  async getAllReports(filters?: { status?: string, type?: string }, page = 0, pageSize = 50): Promise<Report[]> {
    let query = this.supabase
      .from('reports')
      .select(`
         *,
         profiles:user_id ( id, full_name, avatar_url, phone, username, role )
      `)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (filters?.status) {
       query = query.eq('status', filters.status);
    }
    
    if (filters?.type) {
       query = query.eq('type', filters.type);
    }

    const { data, error } = await query;
    
    if (error) {
       console.error('Error fetching all reports:', error);
       return [];
    }

    return (data || []).map(this.mapReportLocation);
  }

  /**
   * Approve a report (make it public/validated)
   */
  async approveReport(reportId: string): Promise<boolean> {
    return this.updateReportStatus(reportId, 'VALIDATED');
  }

  /**
   * Reject a report (mark as False Alarm)
   */
  async rejectReport(reportId: string): Promise<boolean> {
    return this.updateReportStatus(reportId, 'FALSE_ALARM');
  }

  /**
   * Resolve a report (mark as Resolved)
   */
  async resolveReport(reportId: string): Promise<boolean> {
     return this.updateReportStatus(reportId, 'RESOLVED');
  }
  
  /**
   * Technical Dispatch Update (For Engaged/Open/Validated transitions)
   */
  async updateReportStatusDispatch(reportId: string, status: any): Promise<boolean> {
      return this.updateReportStatus(reportId, status);
  }

  /**
   * Generic Status Update
   */
  private async updateReportStatus(reportId: string, status: 'VALIDATED' | 'FALSE_ALARM' | 'RESOLVED'): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('reports')
        .update({ status: status })
        .eq('id', reportId);

      if (error) throw error;

      // Optimistic Update
      this.liveModerationQueue.update(list => list.filter(r => r.id !== reportId));
      this.historyLog.update(list => list.map(r => r.id === reportId ? { ...r, status: status } : r));
      
      const msg = status === 'VALIDATED' ? '✅ Reporte Aprobado' : '🚫 Reporte Rechazado';
      this.toast.success(msg);
      
      // Notify User (Side Effect)
      this.notifyUserStatusChange(reportId, status).catch(console.warn);

      return true;

    } catch (error) {
      console.error(`Error updating report ${reportId}:`, error);
      this.toast.error('No se pudo actualizar el estado.');
      return false;
    }
  }

  // Helper to notify user status change (Command/SideEffect)
  private async notifyUserStatusChange(reportId: string, status: string) {
     // Ideally, we should notify the user via a 'notifications' table or push
     // For now, logging.
     console.log(`User notified of status change: ${status} for report ${reportId}`);
  }

  /**
   * Helper to parse PostGIS/Supabase location to lat/lng
   */
  private mapReportLocation = (report: any): Report => {
    let lat = report.latitude;
    let lng = report.longitude;
    
    // Parse POINT(lng lat) if needed
    if (!lat && report.location) {
       if (typeof report.location === 'string' && report.location.startsWith('POINT')) {
          const parts = report.location.replace('POINT(', '').replace(')', '').split(' ');
          if (parts.length === 2) {
             lng = parseFloat(parts[0]);
             lat = parseFloat(parts[1]);
          }
       }
    }

    // Ensure profile is object not array
    const profile = Array.isArray(report.profiles) ? report.profiles[0] : report.profiles;

    return {
      ...report,
      latitude: lat,
      longitude: lng,
      profiles: profile
    };
  }


  // ==================================================================================
  // USER REPORTING METHODS (Command Pattern)
  // ==================================================================================

  /**
   * Main method to create a report
   */
  async createReport(type: ReportType, description: string, evidenceBlob?: Blob | null): Promise<boolean> {
    if (this.isSending()) return false;
    this.isSending.set(true);

    try {
      const user = this.auth.currentUser();
      if (!user) throw new Error('Debes iniciar sesión para reportar.');

      // 1. Get Location
      let pos;
      try {
        pos = this.location.manualPosition();
        if (!pos) pos = await this.location.getCurrentPosition();
      } catch (locError: any) {
        console.warn('GPS Error:', locError);
      }

      if (!pos) throw new Error('Ubicación requerida. Activa el GPS o marca el punto en el mapa.');
      
      const { latitude, longitude } = pos.coords;

      // 2. Upload Evidence
      let evidenceUrl: string | undefined;
      if (evidenceBlob) {
        const url = await this.uploadEvidence(evidenceBlob);
        if (url) evidenceUrl = url;
      }

      // 3. Priority
      const priority = this.determinePriority(type);

      // 4. Insert
      const payload = {
        user_id: user.id,
        type: type,
        priority: priority,
        description: description || `Reporte de ${type}`,
        status: AppConstants.CONFIG.STATUS.PENDING,
        location: `POINT(${longitude} ${latitude})`,
        evidence_url: evidenceUrl
      };

      const { error } = await this.supabase
        .from('reports')
        .insert(payload);

      if (error) throw error;

      this.toast.success('✅ Reporte enviado para revisión');
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

  private async uploadEvidence(file: Blob): Promise<string | null> {
    try {
      this.isUploading.set(true);
      const fileName = `evidence_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const bucket = AppConstants.CONFIG.STORAGE.BUCKET_EVIDENCE;
      
      const { error } = await this.supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data } = this.supabase.storage.from(bucket).getPublicUrl(fileName);
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

  async getNearbyReports(lat: number, lon: number, radiusMeters: number = 2000): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('get_alerts_in_radius', {
      user_lat: lat,
      user_lon: lon,
      radius_meters: radiusMeters
    });
    return data || [];
  }

  /**
   * Neighbor Validation (Validación Vecinal)
   */
  async validateReport(reportId: string): Promise<boolean> {
    const user = this.auth.currentUser();
    if (!user) return false;

    try {
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

  async getHeatmapData(): Promise<any[]> {
    const { data } = await this.supabase.rpc('get_heatmap_data');
    return data || [];
  }

  private determinePriority(type: ReportType): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
     const critical = [ReportType.SOS, ReportType.RIESGO_VIDA, ReportType.ROBO, ReportType.DELITO_PROCESO, ReportType.ACTIVIDAD_DELICTIVA];
     const high = [ReportType.INCENDIO, ReportType.EMERGENCIA_MEDICA, ReportType.ACCIDENTE];
     const low = [ReportType.CORTE_DE_LUZ, ReportType.LUMINARIA_ROTA, ReportType.BACHE, ReportType.BASURA, ReportType.PELIGRO_VIAL, ReportType.PELIGRO_VIAL_OBSTRUCCION];

     if (critical.includes(type)) return 'CRITICAL';
     if (high.includes(type)) return 'HIGH';
     if (low.includes(type)) return 'LOW';
     return 'MEDIUM';
  }
}
