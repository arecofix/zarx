import { Component, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ReportType } from '../../../../core/models';
import { CameraService } from '../../../../core/services/camera.service';
import { ReportService } from '../../../../core/services/report.service';
import { REPORT_STRATEGIES } from '../../../../core/config/report.config';

@Component({
  selector: 'app-report-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur p-6 animate-fade-in">
       <div class="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative animate-slide-up">
          
          <h3 class="text-xl text-white font-bold mb-4 flex items-center gap-2">
            <span>📝</span> Detalles del Reporte
          </h3>

          <!-- Description -->
          <div class="mb-4">
            <label for="reportDescription" class="text-slate-400 text-xs uppercase tracking-wider font-bold">Descripción (Opcional)</label>
            <textarea 
              id="reportDescription"
              name="reportDescription"
              [ngModel]="reportDescription()"
              (ngModelChange)="reportDescription.set($event)"
              class="w-full mt-2 bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 outline-none resize-none h-24 text-sm"
              placeholder="Ej: Auto gris mal estacionado..."
            ></textarea>
          </div>

          <!-- Evidence Preview -->
          @if (reportEvidencePreview()) {
             <div class="mb-4 relative rounded-lg overflow-hidden border border-slate-600 aspect-video group bg-black">
                <img [src]="reportEvidencePreview()" class="w-full h-full object-contain" />
                <button (click)="clearEvidence()" class="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg hover:bg-red-500">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
             </div>
          }

          <!-- Buttons Grid -->
          <div class="grid grid-cols-2 gap-3 mb-2">
             <!-- Camera Button -->
             <button (click)="captureEvidence()" class="p-3 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-emerald-500 hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span class="text-xs font-bold">CÁMARA</span>
             </button>
             
             <!-- Gallery Button -->
             <button (click)="galleryEvidence()" class="p-3 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-blue-500 hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l6-6 3 3 5-5 5 5M4 22h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
               <span class="text-xs font-bold">GALERÍA</span>
             </button>
          </div>
          
          <div class="mb-4 text-center">
             <span class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                 {{ isPhotoRequired() ? 'FOTO REQUERIDA' : 'EVIDENCIA OPCIONAL' }}
             </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 mt-6">
             <button (click)="onCancel()" class="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors">
                Cancelar
             </button>
             <button 
                (click)="confirmReport()" 
                [disabled]="reportService.isUploading() || (isPhotoRequired() && !reportEvidenceBlob())" 
                class="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
             >
                @if (reportService.isUploading()) {
                   <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                }
                {{ reportService.isUploading() ? 'Enviando...' : 'Enviar Reporte' }}
             </button>
          </div>

       </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  `]
})
export class ReportWizardComponent {
  private cameraService = inject(CameraService);
  public reportService = inject(ReportService);
  private sanitizer = inject(DomSanitizer);

  @Input({ required: true }) type!: ReportType;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  reportDescription = signal('');
  reportEvidenceBlob = signal<Blob | null>(null);
  reportEvidencePreview = signal<SafeUrl | null>(null);

  isPhotoRequired = computed(() => {
     if (!this.type) return false;
     return REPORT_STRATEGIES[this.type]?.requiresPhoto ?? false;
  });

  onCancel() {
    this.close.emit();
  }

  async captureEvidence() {
    const photo = await this.cameraService.capturePhoto();
    this.processPhoto(photo);
  }

  async galleryEvidence() {
    const photo = await this.cameraService.getPhotoFromGallery();
    this.processPhoto(photo);
  }

  private async processPhoto(photo: any) {
    if (photo) {
      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();
      
      this.reportEvidenceBlob.set(blob);
      const objectUrl = URL.createObjectURL(blob);
      this.reportEvidencePreview.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
    }
  }

  clearEvidence() {
    this.reportEvidenceBlob.set(null);
    this.reportEvidencePreview.set(null);
  }

  async confirmReport() {
    if (!this.type) return;

    const desc = this.reportDescription();
    const evidence = this.reportEvidenceBlob();

    const result = await this.reportService.createReport(this.type, desc, evidence);
    
    if (result) {
      this.success.emit();
      this.close.emit();
    }
  }
}
