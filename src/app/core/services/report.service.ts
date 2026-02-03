import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AlertService } from './alert.service';
import { ReportType } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private supabase = inject(SupabaseService).client;
  private alertService = inject(AlertService);

  isUploading = signal(false);

  constructor() { }

  /**
   * Uploads a photo blob to Supabase Storage 'evidence' bucket
   * Returns the public URL
   */
  async uploadEvidence(file: Blob): Promise<string | null> {
    try {
      this.isUploading.set(true);
      
      const fileName = `evidence_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('evidence')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get Public URL
      const { data: publicData } = this.supabase.storage
        .from('evidence')
        .getPublicUrl(filePath);

      return publicData.publicUrl;

    } catch (error) {
      console.error('Error uploading evidence:', error);
      return null;
    } finally {
      this.isUploading.set(false);
    }
  }

  /**
   * Orchestrates the creation of a report:
   * 1. (Optional) Uploads Evidence
   * 2. Creates Alert in Database via AlertService
   */
  async createReport(type: ReportType, description: string, evidenceBlob?: Blob | null): Promise<boolean> {
    let evidenceUrl: string | undefined = undefined;

    if (evidenceBlob) {
      const url = await this.uploadEvidence(evidenceBlob);
      if (url) {
        evidenceUrl = url;
      } else {
        // Decide if we should fail or continue without image.
        // For now, let's continue but maybe warn?
        // Or fail if evidence is crucial.
        // Requirement says "esa alerta se guarde en Supabase con la URL de la imagen".
        console.warn('Failed to upload evidence, sending report without image.');
      }
    }

    // Delegate to AlertService which handles Location, Auth, and DB Insertion
    const result = await this.alertService.sendAlert(type, description, evidenceUrl);
    return !!result;
  }
}
