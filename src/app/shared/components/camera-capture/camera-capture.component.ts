import { Component, OnInit, OnDestroy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

export interface CapturedMedia {
  blob: Blob;
  dataUrl: string;
  safeUrl: SafeUrl;
  fileName: string;
}

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div class="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-700">
        <!-- Header -->
        <div class="bg-slate-800 p-4 flex items-center justify-between border-b border-slate-700">
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <span>📸</span> Capturar Evidencia
          </h2>
          <button
            (click)="close()"
            class="text-slate-400 hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          @if (isCapturing()) {
            <!-- Web Camera Stream -->
            @if (isWebPlatform() && !capturedImage()) {
              <div class="space-y-4">
                <div class="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    #videoElement
                    autoplay
                    playsinline
                    class="w-full h-full object-cover"
                  ></video>
                  
                  <!-- Crosshair overlay -->
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="w-48 h-48 border-2 border-white/50 rounded-lg"></div>
                  </div>
                </div>

                <div class="flex gap-3">
                  <button
                    (click)="captureFromStream()"
                    class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-white transition-all active:scale-95"
                  >
                    📸 Capturar Foto
                  </button>
                  <button
                    (click)="close()"
                    class="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            }
          } @else if (capturedImage()) {
            <!-- Preview -->
            <div class="space-y-4">
              <div class="relative bg-black rounded-lg overflow-hidden">
                <img
                  [src]="capturedImage()!.safeUrl"
                  alt="Evidencia capturada"
                  class="w-full h-auto max-h-96 object-contain"
                />
              </div>

              <div class="flex gap-3">
                <button
                  (click)="confirmCapture()"
                  class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-white transition-all active:scale-95"
                >
                  ✓ Usar Esta Foto
                </button>
                <button
                  (click)="retake()"
                  class="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-all active:scale-95"
                >
                  🔄 Tomar Otra
                </button>
              </div>
            </div>
          } @else if (error()) {
            <!-- Error State -->
            <div class="text-center py-12">
              <div class="text-6xl mb-4">⚠️</div>
              <p class="text-xl text-red-400 mb-2">Error al acceder a la cámara</p>
              <p class="text-sm text-slate-400 mb-6">{{ error() }}</p>
              <button
                (click)="close()"
                class="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-all active:scale-95"
              >
                Cerrar
              </button>
            </div>
          } @else {
            <!-- Initial State -->
            <div class="space-y-4">
              <div class="text-center py-8">
                <div class="text-6xl mb-4">📷</div>
                <p class="text-lg text-slate-300 mb-2">Selecciona una opción</p>
                <p class="text-sm text-slate-400">Captura evidencia del incidente</p>
              </div>

              <div class="grid gap-3">
                <button
                  (click)="openCamera()"
                  class="py-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>📸</span> Tomar Foto
                </button>
                
                @if (isWebPlatform()) {
                  <button
                    (click)="selectFromGallery()"
                    class="py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>🖼️</span> Seleccionar de Galería
                  </button>
                }

                <button
                  (click)="close()"
                  class="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CameraCaptureComponent implements OnInit, OnDestroy {
  private sanitizer = inject(DomSanitizer);

  // Signals
  isCapturing = signal(false);
  capturedImage = signal<CapturedMedia | null>(null);
  error = signal<string>('');

  // Outputs
  mediaCaptured = output<CapturedMedia>();
  cancelled = output<void>();

  // Web Camera
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  ngOnInit() {
    // Auto-open camera on mobile
    if (!this.isWebPlatform()) {
      this.openCamera();
    }
  }

  ngOnDestroy() {
    this.stopStream();
  }

  isWebPlatform(): boolean {
    return Capacitor.getPlatform() === 'web';
  }

  async openCamera() {
    if (this.isWebPlatform()) {
      await this.startWebCamera();
    } else {
      await this.openNativeCamera();
    }
  }

  async startWebCamera() {
    try {
      this.error.set('');
      this.isCapturing.set(true);

      // Request camera permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video && this.stream) {
          video.srcObject = this.stream;
          this.videoElement = video;
        }
      }, 100);

    } catch (err: any) {
      console.error('Camera error:', err);
      this.error.set(err.message || 'No se pudo acceder a la cámara');
      this.isCapturing.set(false);
    }
  }

  async openNativeCamera() {
    try {
      this.error.set('');

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (image.dataUrl) {
        await this.processImage(image.dataUrl);
      }
    } catch (err: any) {
      console.error('Native camera error:', err);
      if (err.message !== 'User cancelled photos app') {
        this.error.set('Error al abrir la cámara');
      } else {
        this.close();
      }
    }
  }

  async selectFromGallery() {
    try {
      this.error.set('');

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      if (image.dataUrl) {
        await this.processImage(image.dataUrl);
      }
    } catch (err: any) {
      console.error('Gallery error:', err);
      if (err.message !== 'User cancelled photos app') {
        this.error.set('Error al seleccionar imagen');
      }
    }
  }

  captureFromStream() {
    if (!this.videoElement) return;

    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.videoElement, 0, 0);

        // Convert to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            await this.processImage(dataUrl, blob);
            this.stopStream();
            this.isCapturing.set(false);
          }
        }, 'image/jpeg', 0.9);
      }
    } catch (err) {
      console.error('Capture error:', err);
      this.error.set('Error al capturar la imagen');
    }
  }

  private async processImage(dataUrl: string, blob?: Blob) {
    try {
      // If blob not provided, convert dataUrl to blob
      if (!blob) {
        const response = await fetch(dataUrl);
        blob = await response.blob();
      }

      const fileName = `evidence_${Date.now()}.jpg`;
      const safeUrl = this.sanitizer.bypassSecurityTrustUrl(dataUrl);

      this.capturedImage.set({
        blob,
        dataUrl,
        safeUrl,
        fileName
      });
    } catch (err) {
      console.error('Process image error:', err);
      this.error.set('Error al procesar la imagen');
    }
  }

  confirmCapture() {
    const image = this.capturedImage();
    if (image) {
      this.mediaCaptured.emit(image);
    }
  }

  retake() {
    this.capturedImage.set(null);
    this.error.set('');
    
    if (this.isWebPlatform()) {
      this.startWebCamera();
    } else {
      this.openCamera();
    }
  }

  close() {
    this.stopStream();
    this.cancelled.emit();
  }

  private stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}
