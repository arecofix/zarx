import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmergencyService } from './emergency.service';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

@Component({
  selector: 'app-sos-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-8 left-0 right-0 flex justify-center z-1000 px-4">
      <button 
        (touchstart)="startPress()" 
        (touchend)="endPress()" 
        (mousedown)="startPress()" 
        (mouseup)="endPress()"
        (mouseleave)="endPress()"
        [class.scale-110]="isPressed()"
        [class.bg-red-600]="!isActive()"
        [class.bg-red-500]="isActive()"
        class="group relative w-24 h-24 rounded-full shadow-lg shadow-red-900/50 border-4 border-red-400/30 transition-all duration-200 ease-out flex items-center justify-center overflow-hidden disable-select"
      >
        <!-- Ripples Logic (CSS Animation) could go here -->
        
        <!-- Progress Ring SVG -->
        <svg class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
           <circle 
             cx="50" cy="50" r="46" 
             fill="none" 
             stroke="rgba(255,255,255,0.3)" 
             stroke-width="4" 
           />
           <circle 
             cx="50" cy="50" r="46" 
             fill="none" 
             stroke="#ffffff" 
             stroke-width="4" 
             stroke-dasharray="289" 
             [attr.stroke-dashoffset]="dashOffset()"
             class="transition-all duration-75"
           />
        </svg>

        <div class="relative z-10 font-black text-white text-xl tracking-tighter">
          {{ isActive() ? 'SENDING' : 'SOS' }}
        </div>
      </button>
    </div>
    
    <!-- Status Feedback -->
    @if (alertSent()) {
      <div class="fixed inset-0 z-2000 bg-black/80 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
        <div class="bg-gray-900 border border-red-500 rounded-2xl p-8 text-center max-w-sm mx-4 shadow-red-500/20 shadow-2xl">
           <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
             </svg>
           </div>
           <h3 class="text-2xl font-bold text-white mb-2">ALERT SENT</h3>
           <p class="text-gray-400 mb-6">Responders have received your location.</p>
           <button (click)="reset()" class="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium">DISMISS</button>
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
  emergencyService = inject(EmergencyService);
  
  isPressed = signal(false);
  isActive = signal(false);
  alertSent = signal(false);
  
  // Progress Logic
  progress = signal(0);
  dashOffset = signal(289); // Circumference 2 * PI * 46 ~= 289
  
  private pressTimer: ReturnType<typeof setTimeout> | undefined;
  private intervalTimer: ReturnType<typeof setInterval> | undefined;
  private readonly PRESS_DURATION = 1500; // 1.5s hold to trigger

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
      await this.emergencyService.triggerSOS();
      
      // Success Haptic
      await Haptics.notification({ type: NotificationType.Success });
      this.alertSent.set(true);
    } catch (err) {
       await Haptics.notification({ type: NotificationType.Error });
       alert('FAILED TO SEND SOS: connection error');
    } finally {
      this.isActive.set(false);
    }
  }
  
  reset() {
    this.alertSent.set(false);
  }
}
