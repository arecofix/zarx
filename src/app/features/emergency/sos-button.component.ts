import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../core/services/alert.service';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { ReportType } from '../../core/models';

@Component({
  selector: 'app-sos-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-8 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
      <button 
        (touchstart)="startPress()" 
        (touchend)="endPress()" 
        (mousedown)="startPress()" 
        (mouseup)="endPress()"
        (mouseleave)="endPress()"
        [class.scale-110]="isPressed()"
        [class.bg-red-600]="!isActive()"
        [class.bg-red-500]="isActive()"
        class="pointer-events-auto group relative w-24 h-24 rounded-full shadow-lg shadow-red-900/50 border-4 border-red-400/30 transition-all duration-200 ease-out flex items-center justify-center overflow-hidden disable-select active:scale-95"
      >
        <!-- Progress Ring SVG -->
        <svg class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
           <circle 
             cx="50" cy="50" r="46" 
             fill="none" 
             stroke="rgba(255,255,255,0.2)" 
             stroke-width="4" 
           />
           <circle 
             cx="50" cy="50" r="46" 
             fill="none" 
             stroke="#ffffff" 
             stroke-width="6" 
             stroke-dasharray="289" 
             stroke-linecap="round"
             [attr.stroke-dashoffset]="dashOffset()"
             class="transition-all duration-75"
           />
        </svg>

        <div class="relative z-10 font-black text-white text-xl tracking-tighter flex flex-col items-center leading-none">
          @if (isActive()) {
             <span class="text-[10px] animate-pulse">ENVIANDO...</span>
          } @else {
             <span>SOS</span>
             <span class="text-[10px] opacity-70 font-mono">HOLD 5S</span>
          }
        </div>
      </button>
    </div>
    
    <!-- Status Feedback: AYUDA SOLICITADA -->
    @if (alertSent()) {
      <div class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-md animate-in fade-in zoom-in duration-300">
        <div class="w-full max-w-sm mx-6 flex flex-col gap-4 text-center">
           
           <div class="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-[0_0_50px_rgba(220,38,38,0.5)]">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
           </div>
           
           <h3 class="text-3xl font-black text-white mb-1 tracking-tighter">AYUDA SOLICITADA</h3>
           <p class="text-red-400 font-bold mb-8">TU UBICACIÓN HA SIDO ENVIADA A LA RED DE RESPUESTA.</p>
           
           <div class="grid grid-cols-2 gap-4">
              <a href="tel:911" class="py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                 <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                 LLAMAR 911
              </a>
              <button (click)="reset()" class="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-lg active:scale-95 transition-transform">
                 CANCELAR
              </button>
           </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .disable-select {
      user-select: none;
      -webkit-user-select: none;
    }
  `]
})
export class SosButtonComponent {
  alertService = inject(AlertService);
  
  isPressed = signal(false);
  isActive = signal(false);
  alertSent = signal(false);
  
  // Progress Logic
  progress = signal(0);
  dashOffset = signal(289);
  
  private intervalTimer: ReturnType<typeof setInterval> | undefined;
  private readonly PRESS_DURATION = 5000; // 5 seconds

  startPress() {
    if (this.alertSent()) return;
    
    this.isPressed.set(true);
    Haptics.impact({ style: ImpactStyle.Light });
    
    const startTime = Date.now();
    
    this.intervalTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / this.PRESS_DURATION, 1);
      
      this.progress.set(pct);
      this.dashOffset.set(289 - (289 * pct));

      if (pct >= 1) {
        this.triggerEmergency();
        this.endPress(); // Cleanup
      }
    }, 16);
  }

  endPress() {
    if (this.isActive()) return; // Already triggered
    
    this.isPressed.set(false);
    clearInterval(this.intervalTimer);
    
    // Reset Ring
    this.progress.set(0);
    this.dashOffset.set(289);
  }

  async triggerEmergency() {
    this.isActive.set(true);
    await Haptics.notification({ type: NotificationType.Warning });
    
    try {
      await this.alertService.sendAlert(ReportType.SOS);
      
      // The Service handles Haptic success, but we can double down or just rely on UI
      this.alertSent.set(true);
    } catch (err) {
       await Haptics.notification({ type: NotificationType.Error });
       alert('ERROR: NO SE PUDO ENVIAR ALERTA. VERIFICA CONEXION.');
    } finally {
      this.isActive.set(false);
    }
  }
  
  reset() {
    this.alertSent.set(false);
  }
}
