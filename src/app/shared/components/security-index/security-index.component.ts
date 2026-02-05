import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, SecurityIndex } from '../../../core/services/analytics.service';
import { LocationService } from '../../../core/services/location.service';

@Component({
  selector: 'app-security-index',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl p-6 border relative overflow-hidden transition-all duration-500"
         [ngClass]="{
           'bg-emerald-950/40 border-emerald-500/30': status()?.color === 'GREEN',
           'bg-yellow-950/40 border-yellow-500/30': status()?.color === 'YELLOW',
           'bg-red-950/40 border-red-500/30': status()?.color === 'ORANGE',
           'bg-slate-900 border-slate-800': !status()
         }">
      
      <!-- Background Effect -->
      <div class="absolute inset-0 opacity-20 pointer-events-none"
           [ngClass]="{
             'bg-emerald-500/10': status()?.color === 'GREEN',
             'bg-yellow-500/10': status()?.color === 'YELLOW',
             'bg-red-500/10': status()?.color === 'ORANGE'
           }"></div>

      <div class="relative z-10 flex flex-col gap-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SERENIDAD VECINAL</p>
              <h2 class="text-2xl font-black text-white tracking-tight">
                {{ status()?.status || 'CALCULANDO...' }}
              </h2>
            </div>
            
            <!-- Icon Indicator -->
            <div class="p-3 rounded-full border shadow-lg"
                 [ngClass]="{
                   'bg-emerald-500/20 border-emerald-500/50 text-emerald-400': status()?.color === 'GREEN',
                   'bg-yellow-500/20 border-yellow-500/50 text-yellow-400': status()?.color === 'YELLOW',
                   'bg-red-500/20 border-red-500/50 text-red-400': status()?.color === 'ORANGE'
                 }">
               @if (status()?.color === 'GREEN') {
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
               } @else if (status()?.color === 'YELLOW') {
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
               } @else {
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
               }
            </div>
        </div>

        <!-- Metrics -->
        @if (status()) {
          <div class="grid grid-cols-2 gap-4 mt-2">
             <div class="p-3 bg-black/20 rounded-lg border border-white/5">
                <div class="text-xs text-slate-400 mb-1">Alertas Activas</div>
                <div class="text-xl font-bold text-white">{{ status()!.active_alerts }}</div>
             </div>
             <div class="p-3 bg-black/20 rounded-lg border border-white/5">
                <div class="text-xs text-slate-400 mb-1">Acciones Exitosas</div>
                <div class="text-xl font-bold text-emerald-400 flex items-center gap-1">
                  {{ status()!.resolved_last_week }}
                  <span class="text-[10px] bg-emerald-500/20 px-1 rounded text-emerald-300">7d</span>
                </div>
             </div>
          </div>
          
          <div class="text-[10px] text-slate-500 text-center mt-1">
             Basado en actividad de los últimos 2km / 24h
          </div>
        }
      </div>
    </div>
  `
})
export class SecurityIndexComponent implements OnInit {
  analytics = inject(AnalyticsService);
  location = inject(LocationService);
  
  status = signal<SecurityIndex | null>(null);

  constructor() {
    effect(async () => {
      const pos = this.location.currentPosition();
      if (pos) {
        // Refresh index when position changes (throttle ideally, but effect handles signal changes)
        const result = await this.analytics.getSecurityIndex(
           pos.coords.latitude, 
           pos.coords.longitude
        );
        this.status.set(result);
      }
    });
  }

  ngOnInit() {
    // Initial content loaded via effect when location is available
  }
}
