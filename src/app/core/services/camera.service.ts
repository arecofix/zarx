import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { SupabaseService } from './supabase.service';

export interface CapturedPhoto {
  dataUrl: string;
  format: string;
  file?: File;
}

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private supabase = inject(SupabaseService).client;

  /**
   * Capture photo from camera (works on web and native)
   * Non-blocking: runs in background
   */
  async capturePhoto(): Promise<CapturedPhoto | null> {
    try {
      // Request permissions first
      if (Capacitor.isNativePlatform()) {
        const permissions = await Camera.requestPermissions();
        if (permissions.camera !== 'granted') {
          console.warn('Camera permission denied');
          return null;
        }
      }

      // Capture photo
      const photo: Photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80, // Balance between quality and file size
        allowEditing: false,
        saveToGallery: false,
        width: 1920, // Max width for performance
        height: 1080
      });

      if (!photo.dataUrl) {
        console.error('No photo data returned');
        return null;
      }

      return {
        dataUrl: photo.dataUrl,
        format: photo.format || 'jpeg'
      };
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.message?.includes('User cancelled')) {
        console.log('User cancelled photo capture');
      } else {
        console.error('Error capturing photo:', error);
      }
      return null;
    }
  }

  /**
   * Capture photo using web getUserMedia (fallback for web)
   */
  async capturePhotoWeb(): Promise<CapturedPhoto | null> {
    return new Promise((resolve) => {
      try {
        // Create video element
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          console.error('Canvas context not available');
          resolve(null);
          return;
        }

        // Request camera access
        navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Use back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        })
        .then(stream => {
          video.srcObject = stream;
          video.play();

          // Wait for video to be ready
          video.onloadedmetadata = () => {
            // Set canvas size to video size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Capture frame
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Stop camera
            stream.getTracks().forEach(track => track.stop());

            resolve({
              dataUrl,
              format: 'jpeg'
            });
          };
        })
        .catch(error => {
          console.error('Error accessing camera:', error);
          resolve(null);
        });
      } catch (error) {
        console.error('Exception in capturePhotoWeb:', error);
        resolve(null);
      }
    });
  }

  /**
   * Upload photo to Supabase Storage
   * @param dataUrl Base64 data URL
   * @param bucket Supabase storage bucket (default: 'evidence')
   * @returns Public URL of uploaded photo
   */
  async uploadPhoto(dataUrl: string, bucket: string = 'evidence'): Promise<string | null> {
    try {
      // Convert data URL to blob
      const blob = await this.dataUrlToBlob(dataUrl);
      
      // Generate unique filename
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filepath = `alerts/${filename}`;

      // Upload to Supabase
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(filepath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '31536000', // 1 year
          upsert: false
        });

      if (error) {
        console.error('Error uploading photo:', error);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(filepath);

      return publicUrl;
    } catch (error) {
      console.error('Exception uploading photo:', error);
      return null;
    }
  }

  /**
   * Convert data URL to Blob
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  /**
   * Capture and upload photo in one call
   * Non-blocking: returns promise
   */
  async captureAndUpload(bucket: string = 'evidence'): Promise<string | null> {
    const photo = await this.capturePhoto();
    
    if (!photo) {
      return null;
    }

    return this.uploadPhoto(photo.dataUrl, bucket);
  }

  /**
   * Check if camera is available
   */
  async isCameraAvailable(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Camera.checkPermissions();
        return permissions.camera === 'granted' || permissions.camera === 'prompt';
      } catch {
        return false;
      }
    } else {
      // Check if getUserMedia is available
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
  }

  /**
   * Request camera permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Camera.requestPermissions();
        return permissions.camera === 'granted';
      } catch {
        return false;
      }
    } else {
      // Web: permissions are requested when accessing camera
      return true;
    }
  }
}
