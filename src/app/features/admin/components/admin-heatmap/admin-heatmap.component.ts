import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, inject, NgZone, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.heat'; 
import { AnalyticsService, Hotspot } from '../../../../core/services/analytics.service';
import { HeatmapService } from '../../../../core/services/heatmap.service';

@Component({
  selector: 'app-admin-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-slate-700">
        <div #mapContainer class="w-full h-full bg-slate-900"></div>
        
        <!-- Controls Overlay -->
        <div class="absolute top-4 right-4 z-400 flex flex-col gap-2">
           <div class="bg-slate-900/90 backdrop-blur p-4 rounded-xl border border-slate-700 shadow-xl w-64">
              <h3 class="font-bold text-white mb-2 flex items-center gap-2">
                 <span>🔥</span> Capas de Análisis
              </h3>
              
              <div class="space-y-2">
                 <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                    <input type="checkbox" [checked]="showHeatmap()" (change)="toggleHeatmap()" class="accent-orange-500 w-4 h-4">
                    Mapa de Calor (Densidad)
                 </label>
                 
                 <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                    <input type="checkbox" [checked]="showClusters()" (change)="toggleClusters()" class="accent-red-500 w-4 h-4">
                    Zonas Calientes (Clusters)
                 </label>
              </div>

              <div class="mt-4 pt-2 border-t border-slate-700">
                  <p class="text-[10px] text-slate-400 font-mono mb-1">FILTRO TEMPORAL</p>
                  <select (change)="updateTimeRange($event)" class="w-full bg-slate-800 text-white text-xs p-2 rounded border border-slate-600">
                     <option value="24">Últimas 24 Horas</option>
                     <option value="168" selected>Última Semana</option>
                     <option value="720">Último Mes</option>
                  </select>
              </div>

              <div class="mt-4">
                 <button (click)="exportReport()" class="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold text-slate-300 transition-colors flex items-center justify-center gap-2">
                    <span>📄</span> Exportar Reporte PDF
                 </button>
              </div>
           </div>

           <!-- Legend -->
           @if (showClusters()) {
              <div class="bg-slate-900/90 backdrop-blur p-4 rounded-xl border border-slate-700 shadow-xl">
                 <h4 class="text-xs font-bold text-slate-400 mb-2">RIESGO DETECTADO</h4>
                 <div class="flex items-center gap-2 mb-1">
                    <span class="w-3 h-3 rounded-full bg-red-500/50 border border-red-500"></span>
                    <span class="text-xs text-white">Alto Riesgo (>10 alertas)</span>
                 </div>
                 <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-orange-500/50 border border-orange-500"></span>
                    <span class="text-xs text-white">Riesgo Medio</span>
                 </div>
              </div>
           }
        </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .cluster-marker {
       display: flex;
       align-items: center;
       justify-content: center;
       color: white;
       font-weight: bold;
       font-size: 10px;
       font-family: monospace;
       font-family: monospace;
       text-shadow: 0 1px 2px black;
    }
    @media print {
      .absolute.top-4 { display: none !important; }
      :host { height: 100vh !important; width: 100vw !important; border: none !important; }
      .rounded-xl { border-radius: 0 !important; }
    }
  `]
})
export class AdminHeatmapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  private analytics = inject(AnalyticsService);
  private heatmapService = inject(HeatmapService);
  private ngZone = inject(NgZone);

  map: L.Map | undefined;
  
  // Layers
  heatLayer: any;
  clusterLayer = new L.FeatureGroup();

  // Signals
  showHeatmap = signal(true);
  showClusters = signal(true);
  
  // Realtime subscription
  private realtimeChannel: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
       this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
             this.initMap();
             this.setupRealtime(); // Listen for live updates
          }, 100);
       });
    }
  }

  private initMap() {
    // Default center for Marcos Paz aprox
    const lat = -34.7709;
    const lng = -58.8335;

    this.map = L.map(this.mapContainer.nativeElement, {
        zoomControl: false
    }).setView([lat, lng], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(this.map);

    this.clusterLayer.addTo(this.map);

    this.loadData(168); // 1 week default
  }

  setupRealtime() {
    // Refresh heatmap/clusters when new reports come in or statuses change
    this.realtimeChannel = this.heatmapService.subscribeToAlertChanges(() => {
       // Debounce slightly or just reload
       console.log('🔄 Data change detected. Refreshing Intelligence Layer...');
       const currentHours = 168; // TODO: Get from current selection signal/var
       this.loadData(currentHours);
    });
  }

  async loadData(hoursAgo: number) {
    // 1. Load Hotspots (Clusters)
    const hotspots = await this.analytics.getHotspots(hoursAgo);
    this.renderClusters(hotspots);

    // 2. Load Heatmap (Points)
    const points = await this.heatmapService.getHeatmapData(hoursAgo);
    
    if ((L as any).heatLayer && this.map) {
       if (this.heatLayer) this.map.removeLayer(this.heatLayer);
       
       const heatPoints = points.map(p => [p.latitude, p.longitude, p.intensity]);
       this.heatLayer = (L as any).heatLayer(heatPoints, {
          radius: 40,
          blur: 25,
          minOpacity: 0.3,
          gradient: { 
             0.0: 'blue', 
             0.4: 'cyan', 
             0.6: 'lime', 
             0.8: 'yellow', 
             1.0: 'red'
          }
       });

       if (this.showHeatmap()) {
          this.heatLayer.addTo(this.map);
       }
    }
  }

  renderClusters(hotspots: Hotspot[]) {
    this.clusterLayer.clearLayers();
    
    hotspots.forEach(h => {
       const isAnomaly = h.risk_score > 50; // Threshold for "Brote de Actividad"
       const color = isAnomaly ? '#ff0000' : (h.risk_score > 10 ? '#ef4444' : '#f97316');
       const radius = Math.max(h.radius_m, 100);

       // 1. Circle Extent
       const circle = L.circle([h.center_lat, h.center_lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.2,
          radius: radius,
          weight: isAnomaly ? 3 : 1,
          dashArray: isAnomaly ? '5, 10' : undefined
       }).addTo(this.clusterLayer);

       if (isAnomaly) {
          // Add pulsing animation class to the path element (Leaflet access via DOM)
          // Simple workaround: An additional marker with CSS animation
          const pulseIcon = L.divIcon({
             className: 'anomaly-pulse',
             html: '<div class="w-full h-full rounded-full border-2 border-red-500 animate-ping"></div>',
             iconSize: [radius/2, radius/2], // Scaled roughly
             iconAnchor: [radius/4, radius/4] 
          });
          // Note: Mapping pixels to meters for icon size is complex, simplifying visual cue:
          // Just put a smaller pulsing marker at center
           L.marker([h.center_lat, h.center_lng], {
             icon: L.divIcon({
                 className: 'anomaly-pulse-center',
                 html: '<div class="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>',
                 iconSize: [20, 20]
             })
           }).addTo(this.clusterLayer);
       }

       // 2. Text Marker
       L.marker([h.center_lat, h.center_lng], {
          icon: L.divIcon({
             className: 'cluster-marker',
             html: `<div>${h.total_alerts}</div>`,
             iconSize: [20, 20]
          })
       }).addTo(this.clusterLayer).bindPopup(`
          <div class="text-slate-900 font-sans p-2 min-w-[150px]">
             <strong class="text-sm border-b border-slate-300 mb-2 pb-1 flex justify-between">
                <span>Zona #${h.cluster_id}</span>
                ${isAnomaly ? '<span class="text-xs bg-red-600 text-white px-1 rounded animate-pulse">BROTE</span>' : ''}
             </strong>
             <div class="grid grid-cols-2 gap-x-2 text-xs">
                <span class="text-slate-500">Alertas:</span> <span class="font-bold text-right">${h.total_alerts}</span>
                <span class="text-slate-500">Riesgo:</span> <span class="font-bold text-right">${h.risk_score.toFixed(1)}</span>
                <span class="text-slate-500">Tipo:</span> <span class="font-bold text-right">${h.main_type}</span>
             </div>
          </div>
       `);
    });
  }
  // ... rest of methods unchanged ...

  toggleHeatmap() {
    this.showHeatmap.update(v => !v);
    if (!this.map || !this.heatLayer) return;
    
    if (this.showHeatmap()) {
       this.heatLayer.addTo(this.map);
    } else {
       this.map.removeLayer(this.heatLayer);
    }
  }

  toggleClusters() {
    this.showClusters.update(v => !v);
    if (!this.map) return;

    if (this.showClusters()) {
       this.clusterLayer.addTo(this.map);
    } else {
       this.map.removeLayer(this.clusterLayer);
    }
  }

  updateTimeRange(event: any) {
     const hours = parseInt(event.target.value);
     this.loadData(hours);
  }

  exportReport() {
     window.print();
  }

  ngOnDestroy() {
     if (this.map) this.map.remove();
     if (this.realtimeChannel) this.heatmapService.supabase.removeChannel(this.realtimeChannel);
  }
}
