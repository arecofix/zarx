import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private toast = inject(ToastService);

  constructor() { }

  async checkPermissions(): Promise<boolean> {
    try {
      const permissions = await Camera.checkPermissions();
      if (permissions.camera === 'granted' || permissions.photos === 'granted') {
        return true;
      }
      
      const request = await Camera.requestPermissions();
      return request.camera === 'granted' || request.photos === 'granted';
    } catch (error) {
      console.warn('Error checking camera permissions:', error);
      return false;
    }
  }

  async takePhoto(): Promise<Blob | null> {
    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      this.toast.info("Se requieren permisos de cámara para adjuntar evidencia.");
      return null;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false, 
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera // Or Prompt to let user choose
      });

      if (image.webPath) {
        return await this.fetchImageAsBlob(image.webPath);
      }
      return null;
    } catch (error) {
      if (typeof error === 'string' && error.includes('cancelled')) {
        // User cancelled, do nothing
      } else {
        console.error('Error taking photo:', error);
        this.toast.error("Error al abrir la cámara.");
      }
      return null;
    }
  }

  private async fetchImageAsBlob(webPath: string): Promise<Blob> {
    const response = await fetch(webPath);
    return await response.blob();
  }
}
