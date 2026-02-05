import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from '../../../core/services/report.service';
import { ReportType } from '../../../core/models';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-panic-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
      <!-- Panic Button -->
      <button
        #panicBtn
        (mousedown)="startLongPress()"
        (mouseup)="cancelLongPress()"
        (mouseleave)="cancelLongPress()"
        (touchstart)="startLongPress()"
        (touchend)="cancelLongPress()"
        (touchcancel)="cancelLongPress()"
        [class.scale-110]="isPressed()"
        [class.animate-pulse]="isPressed()"
        class="relative w-24 h-24 rounded-full bg-linear-to-br from-red-500 to-red-700 shadow-[0_0_30px_rgba(239,68,68,0.6)] flex items-center justify-center transition-all duration-200 active:scale-95 group overflow-hidden"
        [class.opacity-50]="isTriggering()"
        [disabled]="isTriggering()"
      >
        <!-- Progress Ring -->
        <svg 
          *ngIf="isPressed()" 
          class="absolute inset-0 w-full h-full -rotate-90 z-20"
          viewBox="0 0 80 80"
        >
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="white"
            stroke-width="4"
            stroke-dasharray="226"
            [attr.stroke-dashoffset]="progressOffset()"
            class="transition-all duration-100 ease-linear"
          />
        </svg>

        <!-- Icon -->
        <div class="relative z-10 flex flex-col items-center">
          <svg 
            class="w-10 h-10 text-white drop-shadow-lg" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span class="text-[10px] font-bold text-white mt-1 drop-shadow uppercase tracking-wider">SOS</span>
        </div>

        <!-- Ripple/Pulse internal effect -->
        <div 
          *ngIf="isPressed()" 
          class="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping z-0"
        ></div>
      </button>

      <!-- Silent Mode Toggle -->
      <div class="absolute -right-20 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-opacity duration-300" [class.opacity-0]="isPressed()">
         <button (click)="toggleSilent()" class="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" [class.text-emerald-400]="silentMode()" [class.border-emerald-500]="silentMode()">
            <span *ngIf="!silentMode()">🔊</span>
            <span *ngIf="silentMode()">🔇</span>
         </button>
         <span class="text-[9px] font-bold text-slate-500 uppercase">{{ silentMode() ? 'SILENCIO' : 'SONIDO' }}</span>
      </div>

      <!-- Instruction tooltip -->
      <div 
        *ngIf="!hasUsedPanic() && !isPressed()"
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-700 animate-bounce text-center z-50 pointer-events-auto"
      >
        <button (click)="hasUsedPanic.set(true)" class="absolute -top-1 -right-1 w-5 h-5 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 transform translate-y-1/2 rotate-45 w-3 h-3 bg-slate-900 border-r border-b border-slate-700"></div>
        <p class="font-bold mb-1 text-red-400">EMERGENCIA</p>
        <p class="text-slate-300">Mantener 2 seg para activar protocolo SOS</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class PanicButtonComponent implements OnDestroy {
  reportService = inject(ReportService);
  toastService = inject(ToastService);

  isPressed = signal(false);
  isTriggering = signal(false);
  progressOffset = signal(226); // Circumference of r=36 (2*PI*36 ~ 226)
  hasUsedPanic = signal(false);
  silentMode = signal(false);

  private longPressTimer: any = null;
  private progressInterval: any = null;
  private strobeInterval: any = null;
  private readonly LONG_PRESS_DURATION = 2000;

  toggleSilent() {
    this.silentMode.update(v => !v);
    if(this.silentMode()) {
       this.toastService.info('Modo SOS Silencioso activado (Sin sirena local)');
    } else {
       this.toastService.info('Modo SOS Audible activado');
    }
  }

  startLongPress() {
    if (this.isTriggering()) return;

    this.isPressed.set(true);
    this.progressOffset.set(226);

    // Initial Haptic
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }

    const startTime = Date.now();
    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / this.LONG_PRESS_DURATION, 1);
      this.progressOffset.set(226 * (1 - progress));

      // Haptics during press (escalating)
      if (progress > 0 && progress % 0.2 < 0.05 && Capacitor.isNativePlatform()) {
         Haptics.impact({ style: ImpactStyle.Light });
      }

    }, 16);

    this.longPressTimer = setTimeout(() => {
      this.triggerPanic();
    }, this.LONG_PRESS_DURATION);
  }

  cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.isPressed.set(false);
    this.progressOffset.set(226);
  }

  async triggerPanic() {
    this.cancelLongPress();
    this.isTriggering.set(true);

    // Heavy Impact Confirmation
    if (Capacitor.isNativePlatform()) {
       Haptics.notification({ type: NotificationType.Success }); // Or Heavy impact
    }

    try {
        // 1. Activate Hardware (Strobe)
        this.activateStrobeLight();

        // 2. Play Siren (if not silent)
        if (!this.silentMode()) {
           this.playLocalSiren();
        }

        // 3. Send Report to Backend
        // Note: ReportService should handle location attachment automatically
        await this.reportService.createReport(
            ReportType.SOS,
            this.silentMode() ? 'SOS SILENCIOSO - ASISTENCIA REQUERIDA' : 'SOS ACTIVO - ALARMA SONORA'
        );

        this.hasUsedPanic.set(true);
        this.toastService.success('🚨 PROTOCOLO SOS INICIADO');

        // Reset UI state after delay, but SOS logic persists in backend/service state
        setTimeout(() => this.isTriggering.set(false), 5000);

    } catch (e) {
        console.error(e);
        this.toastService.error('FALLO AL ENVIAR SOS - LLAME AL 911');
        this.isTriggering.set(false);
        this.stopStrobe();
    }
  }

  // --- Hardware Helpers ---

  activateStrobeLight() {
     // Hardware Strobe requires @capacitor-community/flashlight which is not installed.
     // Fallback: VISUAL SCREEN STROBE (White/Red flashing overlay)
     
     // Create overlay if not exists
     let strobeDiv = document.getElementById('sos-strobe-overlay');
     if (!strobeDiv) {
        strobeDiv = document.createElement('div');
        strobeDiv.id = 'sos-strobe-overlay';
        strobeDiv.style.position = 'fixed';
        strobeDiv.style.inset = '0';
        strobeDiv.style.zIndex = '9999';
        strobeDiv.style.pointerEvents = 'none';
        strobeDiv.style.mixBlendMode = 'overlay'; // Intense effect
        document.body.appendChild(strobeDiv);
     }

     let isOn = false;
     this.strobeInterval = setInterval(() => {
        isOn = !isOn;
        if (strobeDiv) {
           strobeDiv.style.backgroundColor = isOn ? 'white' : 'red';
           strobeDiv.style.opacity = isOn ? '0.8' : '0.2';
        }
     }, 100); // 10Hz Strobe
     
     // Stop after 30 seconds automatically to save battery
     setTimeout(() => this.stopStrobe(), 30000);
  }

  stopStrobe() {
     if (this.strobeInterval) {
        clearInterval(this.strobeInterval);
        this.strobeInterval = null;
     }
     
     const strobeDiv = document.getElementById('sos-strobe-overlay');
     if (strobeDiv) {
        strobeDiv.remove();
     }
  }

  playLocalSiren() {
     const audio = new Audio('assets/sounds/siren.mp3'); // Ensure this file exists!
     audio.loop = true;
     audio.play().catch(e => console.warn('Audio play failed', e));
     
     // Stop after 30s
     setTimeout(() => {
        audio.pause();
     }, 30000);
  }

  ngOnDestroy() {
     this.cancelLongPress();
     this.stopStrobe();
  }
}
