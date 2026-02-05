import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingStep } from '../../models/home.models';

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-8 backdrop-blur-sm animate-fade-in">
      
      <!-- Skip -->
      <button (click)="finish()" class="absolute top-8 right-8 text-slate-300 text-xs font-mono hover:text-white uppercase">
        Saltar Intro ->
      </button>

      <!-- Content -->
      <div class="max-w-md w-full text-center">
        
        <div class="w-20 h-20 mx-auto mb-8 bg-slate-900 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
           <span class="text-4xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{{ steps[currentStep()].icon }}</span>
        </div>

        <h2 class="text-3xl font-black text-white mb-4 tracking-tighter">{{ steps[currentStep()].title }}</h2>
        <p class="text-slate-400 text-sm leading-relaxed mb-12 min-h-[80px]">
          {{ steps[currentStep()].description }}
        </p>

        <!-- Dots -->
        <div class="flex justify-center gap-2 mb-12">
          @for (step of steps; track $index) {
            <div 
              class="h-1.5 rounded-full transition-all duration-300"
              [class.w-8]="$index === currentStep()"
              [class.bg-emerald-500]="$index === currentStep()"
              [class.w-1.5]="$index !== currentStep()"
              [class.bg-slate-800]="$index !== currentStep()"
            ></div>
          }
        </div>

        <!-- Actions -->
        <button 
          (click)="next()" 
          class="w-full py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg active:scale-95 rounded-sm"
        >
          @if (currentStep() === steps.length - 1) {
            INICIAR OPERACIÓN
          } @else {
            SIGUIENTE
          }
        </button>

      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class OnboardingOverlayComponent {
  @Output() complete = new EventEmitter<void>();
  
  currentStep = signal(0);

  steps: OnboardingStep[] = [
    {
      title: 'SEGURIDAD CIUDADANA',
      description: 'ZARX te conecta con fuerzas de seguridad y vecinos en tiempo real. Tu reporte puede salvar vidas.',
      icon: '🛡️'
    },
    {
      title: 'GANA PUNTOS',
      description: 'Cada reporte validado aumenta tu "Score Ciudadano". Accede a niveles superiores de inteligencia.',
      icon: '⭐'
    },
    {
      title: 'MAPA DEL DELITO COLABORATIVO',
      description: 'Visualizá zonas rojas en tiempo real. Enterate dónde roban y recibí alertas de autos sospechosos reportados por tus vecinos.',
      icon: '📡'
    }
  ];

  next() {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(i => i + 1);
    } else {
      this.finish();
    }
  }

  finish() {
    this.complete.emit();
  }
}
