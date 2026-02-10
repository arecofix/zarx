import { Component, OnDestroy, OnInit, afterNextRender, effect, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MapService } from '../../map/services/map.service';
import { DashboardService } from '../services/dashboard.service';
import { MonitoringService, Emergency } from '../../../core/services/monitoring.service';
import { EmergencyModalComponent } from '../components/emergency-modal/emergency-modal.component';

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule, EmergencyModalComponent],
  template: `
    <div class="relative w-screen h-screen overflow-hidden bg-slate-900 border-4 border-red-900/50">
      
      <!-- MAP CONTAINER -->
      <div id="admin-map" class="absolute inset-0 z-0 opacity-80 mix-blend-luminosity"></div>

      <!-- ALERTS OVERLAY (MODALS) -->
      @for (emergency of monitoringService.activeEmergencies(); track emergency.id) {
         <app-emergency-modal 
            [emergency]="emergency" 
            (close)="dismissEmergency(emergency.id)"
            (resolve)="resolveEmergency(emergency.id)"
         ></app-emergency-modal>
      }

      <!-- HUD OVERLAY -->
      <div class="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between">
         
         <!-- TOP BAR -->
         <div class="flex justify-between items-start">
            <div class="pointer-events-auto bg-black/80 backdrop-blur-md p-4 border-l-4 border-red-600 rounded-lg shadow-2xl">
               <h1 class="text-2xl font-black text-white tracking-widest">CENTRO DE MONITOREO</h1>
               <div class="flex items-center gap-4 mt-2">
                 <div class="flex items-center gap-2">
                   <span class="relative flex h-3 w-3">
                     <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                     <span class="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                   </span>
                   <span class="font-mono text-xs text-red-500 font-bold">ALERTA ALTA: {{ activeReports().length }}</span>
                 </div>

                 <div class="flex items-center gap-2">
                   <span class="relative flex h-3 w-3">
                     <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                     <span class="relative inline-flex rounded-full h-3 w-3 bg-orange-600"></span>
                   </span>
                   <span class="font-mono text-xs text-orange-500 font-bold">SOS LIVE: {{ monitoringService.activeEmergencies().length }}</span>
                 </div>
               </div>
            </div>

            <button (click)="exit()" class="pointer-events-auto px-6 py-3 bg-slate-800 hover:bg-red-900 text-white font-mono text-sm border border-slate-600 hover:border-red-500 rounded transition-all">
               SALIR DEL SISTEMA
            </button>
         </div>

         <!-- BOTTOM BAR -->
         <div class="flex justify-between items-end pointer-events-auto">
            <div class="w-1/3 max-h-48 overflow-y-auto bg-black/80 border border-slate-800 rounded p-4 font-mono text-[10px] text-slate-400 backdrop-blur-sm">
               <h3 class="text-slate-200 mb-2 border-b border-slate-700 pb-1 font-bold">LOG DE EVENTOS</h3>
               
               <!-- Mixed Log -->
               @for(alert of activeReports(); track alert.id) {
                 <div class="mb-2 p-2 bg-slate-900/50 rounded border-l-2 border-yellow-500 hover:bg-slate-800 transition-colors">
                    <div class="text-yellow-400 font-bold flex justify-between">
                       <span>{{alert.type}}</span>
                       <span class="text-slate-500">{{alert.created_at | date:'HH:mm'}}</span>
                    </div>
                    <div class="truncate">{{alert.description}}</div>
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
  dashboardService = inject(DashboardService);
  monitoringService = inject(MonitoringService);
  router = inject(Router);

  // Filter for active reports (Pending or Validated)
  activeReports = computed(() => {
    return this.dashboardService.incomingAlerts().filter(a => 
       a.status === 'PENDING' || a.status === 'VALIDATED' || a.status === 'OPEN' || a.status === 'ENGAGED'
    );
  });

  constructor() {
    afterNextRender(() => {
      // Init map on 'admin-map' div
      this.mapService.initMap('admin-map');
    });

    // Reactive: Add markers when activeReports change
    effect(() => {
       const alerts = this.activeReports();
       this.mapService.clearAlertMarkers();
       alerts.forEach(alert => this.mapService.addAlertMarker(alert));
    });
    
    // Reactive: Add markers for SOS emergencies
    effect(() => {
       const sos = this.monitoringService.activeEmergencies();
       // TODO: Distinct markers for SOS? For now relying on Modal.
       sos.forEach(e => {
          this.mapService.map?.flyTo([e.latitude, e.longitude], 16, { animate: true });
       });
    });
  }

  ngOnInit() {
    // Ensure we have data
    this.dashboardService.getAlerts();
    this.dashboardService.subscribeToAlerts();
    
    // Start Monitoring SOS
    this.monitoringService.startMonitoring();
  }

  ngOnDestroy() {
    this.dashboardService.unsubscribe();
    this.monitoringService.stopMonitoring();
    this.mapService.cleanup();
  }

  exit() {
    this.router.navigate(['/admin/dashboard']); // Go back to main admin dash
  }
  
  // Modal Actions
  dismissEmergency(id: string) {
     // Just close modal locally for now, or implement 'viewed' status
     // For this MVP, we might want to keep it open until resolved? 
     // Let's assume dismissing just hides it locally but it stays in logic if we wanted.
     // But since we iterate over activeEmergencies signal, we need to update the signal or the status.
     // For safety, only resolution clears it.
  }

  resolveEmergency(id: string) {
      this.monitoringService.resolveEmergency(id);
  }
}
