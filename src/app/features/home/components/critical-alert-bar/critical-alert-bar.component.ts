import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Report } from '../../../../core/models';

@Component({
  selector: 'app-critical-alert-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (alerts().length > 0) {
      <div class="w-full bg-red-600/95 backdrop-blur-sm text-white shadow-2xl relative z-100 h-14 sm:h-12 flex items-center border-b border-red-500 overflow-hidden">
        <!-- Icon & Label -->
        <div class="flex items-center px-4 h-full bg-red-700 z-10 shrink-0 shadow-[4px_0_12px_rgba(0,0,0,0.3)]">
           <span class="animate-pulse text-2xl mr-2">🚨</span>
           <div class="flex flex-col leading-none">
             <span class="text-[10px] font-black uppercase tracking-widest opacity-80">Emergencia</span>
             <span class="text-xs font-bold whitespace-nowrap">ALERTA ZARX</span>
           </div>
        </div>

        <!-- Marquee Content -->
        <div class="flex-1 overflow-hidden relative h-full flex items-center bg-red-600">
           <div class="whitespace-nowrap animate-marquee flex items-center gap-16 pl-4">
              @for (alert of alerts(); track alert.id) {
                <div (click)="onAlertClick(alert)" class="flex items-center gap-2 cursor-pointer group px-2 py-1 h-full hover:bg-white/10 transition-colors">
                   <span class="font-black text-sm uppercase group-hover:text-yellow-300">{{ alert.type }}</span>
                   <span class="text-xs font-medium opacity-90 hidden sm:inline">- {{ alert.description || 'Reporte Urgente' }}</span>
                   <span class="text-xs font-medium opacity-90 sm:hidden">- {{ (alert.description || 'Reporte').slice(0, 20) }}...</span>
                   <span class="text-[10px] bg-white text-red-600 px-1.5 py-0.5 rounded-full font-bold ml-1 shadow-sm">
                     {{ alert.created_at | date:'HH:mm' }}
                   </span>
                </div>
              }
           </div>
        </div>

        <!-- Dismiss (Desktop) -->
        <div class="h-full px-3 hidden sm:flex items-center justify-center bg-red-700 hover:bg-red-800 z-10 cursor-pointer transition-colors" title="Ocultar Alerta">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-marquee {
      animation: marquee 20s linear infinite;
    }
    .animate-marquee:hover {
      animation-play-state: paused;
    }
    @keyframes marquee {
      0% { transform: translateX(10%); }
      100% { transform: translateX(-100%); }
    }
  `]
})
export class CriticalAlertBarComponent {
  alerts = input<Report[]>([]);

  @Output() alertClicked = new EventEmitter<Report>();

  onAlertClick(alert: Report) {
    this.alertClicked.emit(alert);
  }
}
