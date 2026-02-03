import { Component, OnDestroy, OnInit, afterNextRender, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MapService } from '../../map/services/map.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-screen h-screen overflow-hidden bg-slate-900 border-4 border-red-900/50">
      
      <!-- MAP CONTAINER -->
      <div id="admin-map" class="absolute inset-0 z-0 opacity-80 mix-blend-luminosity"></div>

      <!-- HUD OVERLAY -->
      <div class="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between">
         
         <!-- TOP BAR -->
         <div class="flex justify-between items-start">
            <div class="pointer-events-auto bg-black/80 backdrop-blur-md p-4 border-l-4 border-red-600 rounded-lg">
               <h1 class="text-2xl font-black text-white tracking-widest">CENTRO DE MONITOREO</h1>
               <div class="flex items-center gap-2 mt-2">
                 <span class="relative flex h-3 w-3">
                   <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                   <span class="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                 </span>
                 <span class="font-mono text-xs text-red-500 font-bold">EN VIVO: {{ alertService.activeAlerts().length }} ALERTAS ACTIVAS</span>
               </div>
            </div>

            <button (click)="exit()" class="pointer-events-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm border border-slate-600 rounded">
               SALIR
            </button>
         </div>

         <!-- BOTTOM BAR -->
         <div class="flex justify-between items-end pointer-events-auto">
            <div class="w-1/3 max-h-48 overflow-y-auto bg-black/80 border border-slate-800 rounded p-4 font-mono text-[10px] text-slate-400">
               <h3 class="text-slate-200 mb-2 border-b border-slate-700 pb-1">LOG DE EVENTOS</h3>
               @for(alert of alertService.activeAlerts(); track alert.id) {
                 <div class="mb-2 p-2 bg-slate-900/50 rounded border-l-2 border-red-500">
                    <div class="text-red-400 font-bold">{{alert.type}}</div>
                    <div>{{alert.description}}</div>
                    <div class="text-slate-600">{{alert.created_at}}</div>
                 </div>
               }
            </div>
         </div>
         
      </div>

    </div>
  `
})
export class MonitoringComponent implements OnInit, OnDestroy {
  mapService = inject(MapService);
  alertService = inject(AlertService);
  router = inject(Router);

  constructor() {
    afterNextRender(() => {
      // Init map on 'admin-map' div
      this.mapService.initMap('admin-map');
    });

    // Reactive: Add markers when activeAlerts change
    effect(() => {
       const alerts = this.alertService.activeAlerts();
       this.mapService.clearAlertMarkers();
       alerts.forEach(alert => this.mapService.addAlertMarker(alert));
    });
  }

  ngOnInit() {
    this.alertService.startMonitoring();
  }

  ngOnDestroy() {
    this.alertService.stopMonitoring();
    this.mapService.cleanup();
  }

  exit() {
    this.router.navigate(['/profile']);
  }
}
