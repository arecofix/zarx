import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MediaUploadService {
  private supabase = inject(SupabaseService).client;

  // Signals
  uploadProgress = signal<UploadProgress | null>(null);
  isUploading = signal(false);

  private readonly BUCKET_NAME = 'incidencia-evidencia';

  /**
   * Upload media file to Supabase Storage
   * @param blob File blob to upload
   * @param fileName File name
   * @param alertId Optional alert ID to organize files
   * @returns Public URL of uploaded file
   */
  async uploadEvidence(
    blob: Blob,
    fileName: string,
    alertId?: string
  ): Promise<string | null> {
    this.isUploading.set(true);
    this.uploadProgress.set({
      fileName,
      progress: 0,
      status: 'uploading'
    });

    try {
      // Generate unique file name
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const extension = fileName.split('.').pop() || 'jpg';
      const uniqueFileName = alertId 
        ? `${alertId}/${timestamp}_${randomStr}.${extension}`
        : `${timestamp}_${randomStr}.${extension}`;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(uniqueFileName, blob, {
          contentType: blob.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Update progress
      this.uploadProgress.update(p => p ? { ...p, progress: 50 } : null);

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(uniqueFileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Success
      this.uploadProgress.set({
        fileName,
        progress: 100,
        status: 'success',
        url: urlData.publicUrl
      });

      return urlData.publicUrl;

    } catch (error: any) {
      console.error('Upload error:', error);
      
      this.uploadProgress.set({
        fileName,
        progress: 0,
        status: 'error',
        error: error.message || 'Error al subir archivo'
      });

      return null;
    } finally {
      this.isUploading.set(false);
      
      // Clear progress after 3 seconds
      setTimeout(() => {
        this.uploadProgress.set(null);
      }, 3000);
    }
  }

  async uploadAvatar(
    blob: Blob,
    userId: string
  ): Promise<string | null> {
    const fileName = `${userId}_${Date.now()}.jpg`;
    
    try {
      const { data, error } = await this.supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (e) {
      console.error('Avatar upload error:', e);
      return null;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: { blob: Blob; fileName: string }[],
    alertId?: string
  ): Promise<string[]> {
    const urls: string[] = [];

    for (const file of files) {
      const url = await this.uploadEvidence(file.blob, file.fileName, alertId);
      if (url) {
        urls.push(url);
      }
    }

    return urls;
  }

  /**
   * Delete file from storage
   */
  async deleteEvidence(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  /**
   * Check if bucket exists and is accessible
   */
  async checkBucketAccess(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      return !error;
    } catch (error) {
      console.error('Bucket access error:', error);
      return false;
    }
  }

  /**
   * Get file URL from path
   */
  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}
