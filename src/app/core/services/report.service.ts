import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocationService } from './location.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { Logger } from '../utils/logger';
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
  
  // Fallback mode for when DB relationships are missing
  private fallbackMode = false;
  
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
  async fetchPendingReports(): Promise<void> {
    this.isLoadingReports.set(true);
    try {
      // Fetch Active Reports (Status != 'RESOLVED' && Status != 'FALSE_ALARM')
      // This ensures we see ongoing SOS/Critical events in the Live Feed, not just Pending ones.
      let query = this.supabase
        .from('reports')
        .select(this.fallbackMode ? '*' : `
          *,
          profiles:user_id ( id, full_name, avatar_url, phone, username, role )
        `)
        .not('status', 'in', '("RESOLVED","FALSE_ALARM")') 
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        // Auto-detect missing relation and retry once
        if (error.code === 'PGRST200' && !this.fallbackMode) {
           console.warn('⚠️ PGRST200 Detected: Retrying in Fallback Mode (No Profiles)...');
           this.fallbackMode = true;
           this.toast.warning('Base de datos incompleta. Mostrando reportes sin datos de usuario.');
           return this.fetchPendingReports(); // Retry recursively once
        }
        throw error;
      }
      
      const reports = ((data as any[]) || []).map(this.mapReportLocation);
      
      // Filter Logic:
      // Live Feed: All Critical Reports regardless of status (as long as active)
      const live = reports.filter(r => this.isCritical(r.type));
      
      // Queue/History/Moderation: Non-critical reports that are specifically PENDING moderation
      // We don't want approved potholes cluttering the "Pending" list, they go to history.
      const pendingNonCritical = reports.filter(r => !this.isCritical(r.type) && r.status === 'PENDING');

      this.liveModerationQueue.set(live);
      // For the implicit moderation queue of non-criticals, we might need another signal or just let History handle them.
      // But typically "History Log" in report service was used for "Non-Critical Pending".
      // Let's keep it consistent: historyLog here will hold pending non-criticals for moderation if used that way, 
      // or we can just ignore them here if ReportHistoryComponent uses getAllReports.
      // Assuming existing usage:
      this.historyLog.set(pendingNonCritical); 

      this.startRealtimeListener();

    } catch (error: unknown) {
      console.error('Error fetching reports:', error);
      const pgError = error as { code?: string, message?: string };
      
      // Specific handling for missing Foreign Key (Common in new setups)
      if (pgError.code === 'PGRST200') {
          console.error('👉 DB FIX REQUIRED: Run migrations/20240210000003_fix_admin_permissions.sql');
          this.toast.error('Error Crítico: Faltan relaciones DB. Ejecute script SQL.');
      } else {
          this.toast.error(pgError.message || 'Error al cargar reportes activos.');
      }
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
           const newRecord = payload.new as Record<string, unknown>;
           
           if (newRecord && newRecord['id']) {
              this.processIncomingReport(newRecord as { id: string });
           }
        }
      )
      .subscribe((status) => {
         Logger.debug('Realtime Subscription Status:', status);
      });
  }

  private async processIncomingReport(record: { id: string }) {
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
  public isCritical(type: string | ReportType): boolean {
      const t = type as string;
      return [
        'SOS', 'PANIC', 'RIESGO_VIDA', 'ROBO', 
        'INCENDIO', 'ACCIDENTE', 'EMERGENCIA_MEDICA', 
        'DELITO_PROCESO', 'ACTIVIDAD_DELICTIVA'
      ].includes(t);
  }

  /**
   * Fetch ALL reports (History/Log) with pagination and filters
   */
  async getAllReports(filters?: { status?: string, type?: string, category?: 'SECURITY' | 'SERVICE' }, page = 0, pageSize = 50): Promise<Report[]> {
    try {
        let query = this.supabase
          .from('reports')
          .select(this.fallbackMode ? '*' : `
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

        // Category Filter support
        if (filters?.category) {
            // Critical Types List matches isCritical logic
            const criticalTypes = ['SOS', 'PANIC', 'RIESGO_VIDA', 'ROBO', 'INCENDIO', 'ACCIDENTE', 'EMERGENCIA_MEDICA', 'DELITO_PROCESO', 'ACTIVIDAD_DELICTIVA'];
            
            if (filters.category === 'SECURITY') {
                 query = query.in('type', criticalTypes);
            } else {
                 // For services/infrastructure (NOT IN Critical Types)
                 // Using Supabase/Postgrest filter syntax for 'not.in'
                 // Format: ('Type1','Type2')
                 const list = `(${criticalTypes.map(t => `"${t}"`).join(',')})`;
                 query = query.not('type', 'in', list);
            }
        }

        const { data, error } = await query;
        
        if (error) {
           if (error.code === 'PGRST200' && !this.fallbackMode) {
               console.warn('⚠️ PGRST200 Detected in History: Retrying in Fallback Mode...');
               this.fallbackMode = true;
               // Recursive retry
               return this.getAllReports(filters, page, pageSize);
           }
           console.error('Error fetching all reports:', error);
           return [];
        }

        return ((data as any[]) || []).map(this.mapReportLocation);
    } catch (e) {
        console.error('Exception fetching reports:', e);
        return [];
    }
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
  async rejectReport(reportId: string, reason?: string): Promise<boolean> {
    return this.updateReportStatus(reportId, 'FALSE_ALARM', reason);
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
  async updateReportStatusDispatch(reportId: string, status: 'PENDING' | 'VALIDATED' | 'FALSE_ALARM' | 'RESOLVED' | 'VERIFIED' | 'OPEN' | 'ENGAGED'): Promise<boolean> {
      return this.updateReportStatus(reportId, status);
  }

  /**
   * Generic Status Update
   */
  private async updateReportStatus(reportId: string, status: 'PENDING' | 'VALIDATED' | 'FALSE_ALARM' | 'RESOLVED' | 'VERIFIED' | 'OPEN' | 'ENGAGED', reason?: string): Promise<boolean> {
    try {
      const updates: { status: string; rejection_reason?: string } = { status: status };
      if (reason) updates.rejection_reason = reason;

      const { error } = await this.supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId);

      if (error) throw error;

      // Optimistic Update
      this.liveModerationQueue.update(list => list.filter(r => r.id !== reportId));
      this.historyLog.update(list => list.map(r => r.id === reportId ? { ...r, status: status } : r));
      
      const msg = status === 'VALIDATED' ? '✅ Reporte Aprobado' : '🚫 Reporte Rechazado';
      this.toast.success(msg);
      
      // Notify User (Side Effect)
      this.notifyUserStatusChange(reportId, status, reason).catch(console.warn);

      return true;

    } catch (error) {
      console.error(`Error updating report ${reportId}:`, error);
      this.toast.error('No se pudo actualizar el estado.');
      return false;
    }
  }

  // Helper to notify user status change (Command/SideEffect)
  private async notifyUserStatusChange(reportId: string, status: string, reason?: string) {
     try {
        const { data: report } = await this.supabase.from('reports').select('user_id, type').eq('id', reportId).single();
        if (!report || !report.user_id) return;

        let title = 'Actualización de Reporte';
        let body = `El estado de tu reporte ha cambiado a ${status}.`;
        let type = 'info';

        if (status === 'VALIDATED') {
            title = '✅ Reporte Aprobado';
            body = `Tu reporte de ${report.type} ha sido validado y es visible para la comunidad.`;
            type = 'success';
        } else if (status === 'FALSE_ALARM') {
            title = '🚫 Reporte Rechazado';
            body = `Tu reporte de ${report.type} ha sido marcado como no válido/falsa alarma.`;
            if (reason) body += ` Motivo: ${reason}`;
            type = 'error';
        } else if (status === 'RESOLVED') {
            title = '🏁 Reporte Finalizado';
            body = `El incidente ${report.type} ha sido marcado como RESUELTO.`;
            type = 'success';
        }

        // Insert Notification
        await this.supabase.from('notifications').insert({
            user_id: report.user_id,
            title,
            body,
            type
        });

     } catch (e) {
        console.warn('Failed to notify user:', e);
     }
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

      // Shadowban check
      const profile = this.auth.profile();
      if (profile?.is_shadowbanned) {
         Logger.warn(`[SHADOWBAN] Silently rejecting report from ${user.id}`);
         // Return fake success
         this.toast.success('✅ Reporte enviado para revisión');
         this.safeHaptics(NotificationType.Success);
         return true;
      }

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

    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error creating report:', err);
      this.toast.error(err.message || 'Error al enviar reporte.');
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

  /**
   * Helper to parse PostGIS/Supabase location to lat/lng
   * Defined as arrow function or binded method
   */
  private mapReportLocation = (report: Partial<Report> & Record<string, any>): Report => {
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
    } as Report;
  }

  private async safeHaptics(type: NotificationType) {
    if (Capacitor.isNativePlatform()) {
      try { await Haptics.notification({ type }); } catch (e) {}
    }
  }

  async getNearbyReports(lat: number, lon: number, radiusMeters: number = 2000): Promise<Report[]> {
    const { data, error } = await this.supabase.rpc('get_alerts_in_radius', {
      center_lat: lat,
      center_lng: lon,
      radius_meters: radiusMeters
    });
    if (error) {
      console.warn('Error fetching nearby reports:', error.message);
      return [];
    }
    return (data || []).map(this.mapReportLocation);
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

  public determinePriority(type: ReportType | string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
     const t = type as string;
     const critical = ['SOS', 'RIESGO_VIDA', 'ROBO', 'DELITO_PROCESO', 'ACTIVIDAD_DELICTIVA'];
     const high = ['INCENDIO', 'EMERGENCIA_MEDICA', 'ACCIDENTE'];
     
     if (critical.includes(t)) return 'CRITICAL';
     if (high.includes(t)) return 'HIGH';
     if (['CORTE_DE_LUZ', 'PELIGRO_VIAL'].includes(t)) return 'MEDIUM';
     
     return 'LOW';
  }
}
