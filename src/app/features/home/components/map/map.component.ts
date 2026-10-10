import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  PLATFORM_ID,
  Inject,
  inject,
  signal,
  effect,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  afterNextRender
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ZoneService } from '../../../admin/services/zone.service';
import { MapService, PublicAlert } from '../../services/map.service';
import { LocationService } from '../../../../core/services/location.service';
import { HeatmapService } from '../../../../core/services/heatmap.service';
import { ToastService } from '../../../../core/services/toast.service';
import { getLeaflet } from '../../../../core/utils/leaflet.util';
import { AppConstants } from '../../../../core/constants/app.constants';

@Component({
  selector: 'app-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="map-wrapper">
      <div #mapContainer class="map-canvas"></div>
      
      <!-- Heatmap Toggle (Top Center) -->
      <div class="fixed top-40 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-300 pointer-events-auto" [class.opacity-0]="!isMapReady()">
         <button 
           (click)="toggleHeatmap()" 
           class="px-4 py-1.5 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2 text-xs font-bold transition-all active:scale-95"
           [class.bg-orange-500]="showHeatmap()"
           [class.text-white]="showHeatmap()"
           [class.border-orange-400]="showHeatmap()"
           [class.bg-slate-900_80]="!showHeatmap()"
           [class.text-slate-300]="!showHeatmap()"
           [class.border-slate-700]="!showHeatmap()"
         >
            <span>🔥</span> {{ showHeatmap() ? 'Ocultar Calor' : 'Ver Mapa de Delito' }}
         </button>
      </div>

      <!-- Manual Location Selection Crosshair (Center) -->
       <div *ngIf="isSelectionMode()" class="absolute inset-0 z-400 pointer-events-none flex items-center justify-center">
          <div class="relative w-8 h-8 pointer-events-none">
             <div class="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/80 -translate-y-1/2 shadow-sm"></div>
             <div class="absolute left-1/2 top-0 h-full w-0.5 bg-red-500/80 -translate-x-1/2 shadow-sm"></div>
             <div class="absolute inset-0 border-2 border-red-500 rounded-full opacity-50"></div>
          </div>
       </div>

       <!-- Selection Controls -->
       <div *ngIf="isSelectionMode()" class="absolute bottom-32 left-1/2 -translate-x-1/2 z-400 flex gap-2 animate-slide-up">
          <button (click)="cancelSelection()" class="px-6 py-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 font-bold active:scale-95 transition-all">
             Cancelar
          </button>
          <button (click)="confirmSelection()" class="px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-900/40 font-bold active:scale-95 transition-all flex items-center gap-2">
             <span>📍</span> Confirmar Ubicación
          </button>
       </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 400px;
      position: relative;
      overflow: hidden;
    }

    .map-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 400px;
      background-color: #020617;
    }

    .map-canvas {
      width: 100%;
      height: 100%;
      min-height: 400px;
      position: absolute;
      inset: 0;
    }

    ::ng-deep .leaflet-container {
      width: 100% !important;
      height: 100% !important;
      background-color: #020617 !important;
    }

    .custom-popup .leaflet-popup-content-wrapper {
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .custom-popup .leaflet-popup-tip {
      background: rgba(15, 23, 42, 0.95);
    }
    .custom-popup .leaflet-popup-content {
      margin: 0;
      line-height: 1.5;
    }

    /* Radar Pulse Animation for Citizen Marker */
    .radar-marker-container {
      position: relative;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .radar-core {
      width: 12px;
      height: 12px;
      background-color: #0ea5e9;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.8);
      z-index: 20;
    }

    .radar-beam {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 1px solid rgba(14, 165, 233, 0.3);
      border-top-color: rgba(14, 165, 233, 0.9);
      border-left-color: rgba(14, 165, 233, 0.0);
      border-right-color: rgba(14, 165, 233, 0.0);
      border-bottom-color: rgba(14, 165, 233, 0.0);
      animation: radar-spin 2s linear infinite;
      z-index: 10;
    }
    
    .radar-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: rgba(14, 165, 233, 0.4);
      border-radius: 50%;
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      z-index: 5;
    }
    
    .radar-pulse-2 {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 1px solid rgba(14, 165, 233, 0.6);
      border-radius: 50%;
      animation: pulse-ring-border 2.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      animation-delay: 0.5s;
      z-index: 5;
    }

    @keyframes radar-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.2); opacity: 0.8; }
      80%, 100% { transform: scale(1.2); opacity: 0; }
    }

    @keyframes pulse-ring-border {
      0% { transform: scale(0.3); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
  `]
})
export class MapComponent implements OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  public map: any = null;
  private zoneService = inject(ZoneService);
  private mapService = inject(MapService);
  private locationService = inject(LocationService);
  private heatmapService = inject(HeatmapService);
  private toastService = inject(ToastService);
  
  private L: any = null;
  private zonesLayer: any = null;
  private alertsLayer: any = null; 
  private userLayer: any = null;
  private heatLayer: any = null; 
  private resizeObserver: ResizeObserver | null = null;

  showHeatmap = signal(false);
  isSelectionMode = signal(false);
  selectedLocation = signal<{ lat: number; lng: number } | null>(null);
  isMapReady = signal(false);
  @Output() locationSelected = new EventEmitter<{lat: number, lng: number}>();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    afterNextRender(() => {
      this.initMap();
    });

    // Reactive effect for user marker
    effect(() => {
       const pos = this.locationService.currentPosition();
       if (pos && pos.coords && this.map && this.L && this.userLayer) {
          this.updateUserMarker(pos.coords.latitude, pos.coords.longitude);
       }
    });

    // Selection mode effect
    effect(() => {
       if (this.isSelectionMode()) {
          this.enableSelectionMode();
       } else {
          this.disableSelectionMode();
       }
    });
  }

  private async initMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.mapContainer?.nativeElement) {
      return;
    }

    try {
      this.L = await getLeaflet(this.platformId);
      if (!this.L || typeof this.L.map !== 'function') {
        console.warn('[MapComponent] Leaflet map constructor not available');
        return;
      }

      // Feature groups
      this.zonesLayer = new this.L.FeatureGroup();
      this.alertsLayer = new this.L.FeatureGroup();
      this.userLayer = new this.L.FeatureGroup();

      // Marcos Paz coordinates fallback
      let lat = AppConstants.CONFIG.LOCATION.DEFAULT_LAT; 
      let lng = AppConstants.CONFIG.LOCATION.DEFAULT_LNG;
      let zoom = AppConstants.MAP.DEFAULT_ZOOM;

      const currentPos = this.locationService.currentPosition();
      if (currentPos && currentPos.coords) {
        lat = currentPos.coords.latitude;
        lng = currentPos.coords.longitude;
      }

      // Initialize Map
      this.map = this.L.map(this.mapContainer.nativeElement, {
        zoomControl: false, 
        attributionControl: false,
        zoomAnimation: true
      }).setView([lat, lng], zoom);

      // Dark canvas tile layer (Esri Dark Gray - Unwatermarked & Fast)
      this.L.tileLayer(AppConstants.MAP.TILES.ARCGIS_DARK, {
        maxZoom: 19,
        maxNativeZoom: 16,
        attribution: AppConstants.MAP.ATTRIBUTION.ARCGIS
      }).addTo(this.map);

      this.zonesLayer.addTo(this.map);
      this.alertsLayer.addTo(this.map);
      this.userLayer.addTo(this.map);

      // Setup ResizeObserver to guarantee rendering without grey cuts
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        });
        this.resizeObserver.observe(this.mapContainer.nativeElement);
      }

      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 200);

      this.isMapReady.set(true);

      // Plot initial user marker if location is available
      if (currentPos && currentPos.coords) {
        this.updateUserMarker(currentPos.coords.latitude, currentPos.coords.longitude);
      }

      // Load zones and intelligence
      await this.loadZones();
      await this.loadIntelligence();

      // Try flying to real position if ready
      this.locationService.getCurrentPosition().then(initialPos => {
        if (initialPos && initialPos.coords && this.map) {
          try {
            this.updateUserMarker(initialPos.coords.latitude, initialPos.coords.longitude);
            this.flyTo(initialPos.coords.latitude, initialPos.coords.longitude, 15);
          } catch (e) {
            console.warn('[MapComponent] Could not center on initial position:', e);
          }
        }
      });

    } catch (err) {
      console.error('[MapComponent] Failed to initialize Leaflet map safely:', err);
    }
  }

  updateUserMarker(lat: number, lng: number): void {
    if (!this.map || !this.L || !this.userLayer || typeof this.L.marker !== 'function' || typeof this.L.divIcon !== 'function') {
      return;
    }
    
    try {
      this.userLayer.clearLayers();
      
      const userIcon = this.L.divIcon({
         className: 'user-marker-icon',
         html: `
            <div class="radar-marker-container">
               <div class="radar-beam"></div>
               <div class="radar-pulse"></div>
               <div class="radar-pulse-2"></div>
               <div class="radar-core"></div>
            </div>
         `,
         iconSize: [64, 64],
         iconAnchor: [32, 32]
      });

      const marker = this.L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 });
      this.userLayer.addLayer(marker);
    } catch (err) {
      console.warn('[MapComponent] updateUserMarker warning:', err);
    }
  }

  public flyTo(lat: number, lng: number, zoom?: number): void {
     if (this.map && typeof this.map.flyTo === 'function') {
        this.map.flyTo([lat, lng], zoom || 15, {
           animate: true,
           duration: 1.5
        });
     }
  }

  async loadZones(): Promise<void> {
    try {
      const layers = await this.zoneService.loadZones();
      if (layers && this.zonesLayer) {
        layers.forEach(l => l.addTo(this.zonesLayer));
      }
    } catch (e) {
      console.warn('[MapComponent] Error loading zones:', e);
    }
  }

  async loadIntelligence(): Promise<void> {
    try {
      await this.mapService.loadPublicIntelligence();
      const alerts = this.mapService.recentAlerts();
      this.renderAlertMarkers(alerts);
      await this.loadHeatmapData();
    } catch (e) {
      console.warn('[MapComponent] Error loading intelligence:', e);
    }
  }

  async loadHeatmapData(): Promise<void> {
    try {
      const heatmapPoints = await this.heatmapService.getDecayedHeatmap();
      if (this.L && typeof this.L.heatLayer === 'function' && heatmapPoints.length > 0) {
        const heatData = this.heatmapService.toLeafletHeatFormat(heatmapPoints);
        this.heatLayer = this.L.heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: { 
            0.0: 'blue',
            0.4: 'lime', 
            0.6: 'yellow',
            0.8: 'orange',
            1.0: 'red' 
          }
        });
      }
    } catch (error) {
      console.warn('[MapComponent] Heatmap unavailable:', error);
    }
  }

  toggleHeatmap(): void {
    if (!this.map) return;
    this.showHeatmap.update(v => !v);
    
    if (this.showHeatmap()) {
      if (this.heatLayer) {
         this.heatLayer.addTo(this.map);
         this.toastService.info('Visualizando Mapa de Calor');
      } else {
         this.toastService.warning('No hay suficientes datos para el mapa de calor');
         setTimeout(() => this.showHeatmap.set(false), 2000);
      }
    } else {
      if (this.heatLayer) this.map.removeLayer(this.heatLayer);
    }
  }

  renderAlertMarkers(alerts: PublicAlert[]): void {
    if (!this.L || !this.alertsLayer || typeof this.L.marker !== 'function') return;
    this.alertsLayer.clearLayers();

    alerts.forEach(alert => {
       const color = this.getColorForType(alert.type);
       const iconHtml = this.getIconForType(alert.type);

       const marker = this.L.marker([alert.latitude, alert.longitude], {
         icon: this.L.divIcon({
           className: 'custom-div-icon',
           html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${color}; font-size: 16px;">${iconHtml}</div>`,
           iconSize: [30, 30],
           iconAnchor: [15, 15]
         })
       });

       marker.bindPopup(`
          <div class="p-3">
             <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">${alert.type}</span>
                <span class="text-xs text-slate-400 ml-auto">${this.formatDate(alert.created_at)}</span>
             </div>
             <p class="text-sm font-medium text-slate-200 line-clamp-2">${alert.description || 'Sin descripción'}</p>
             ${alert.media_url ? `<div class="mt-2 rounded-lg overflow-hidden h-24 bg-slate-800"><img src="${alert.media_url}" class="w-full h-full object-cover"></div>` : ''}
          </div>
       `, {
          className: 'custom-popup'
       });

       this.alertsLayer.addLayer(marker);
    });
  }

  getColorForType(type: string): string {
    switch (type) {
      case 'SOS': return '#ef4444';
      case 'ROBO': return '#f97316';
      case 'ACCIDENTE': return '#eab308';
      case 'INCENDIO': return '#dc2626';
      case 'INUNDACION': return '#06b6d4';
      default: return '#64748b';
    }
  }

  getIconForType(type: string): string {
    switch (type) {
      case 'SOS': return '🆘';
      case 'ROBO': return '🦹';
      case 'ACCIDENTE': return '🚗';
      case 'INCENDIO': return '🔥';
      case 'INUNDACION': return '🌊';
      default: return '⚠️';
    }
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  enableSelectionMode(): void {
     if (this.map) {
         const center = this.map.getCenter();
         this.selectedLocation.set({ lat: center.lat, lng: center.lng });
     }
  }

  disableSelectionMode(): void {
     this.isSelectionMode.set(false);
     this.selectedLocation.set(null);
  }

  confirmSelection(): void {
     const loc = this.selectedLocation();
     if (loc) {
        const manualPos: any = {
          timestamp: Date.now(),
          coords: {
            latitude: loc.lat,
            longitude: loc.lng,
            accuracy: 0,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          }
        };
        this.locationService.manualPosition.set(manualPos);
        this.locationSelected.emit(loc);
        this.disableSelectionMode();
        this.toastService.success('Ubicación fijada manualmente');
     }
  }

  cancelSelection(): void {
     this.disableSelectionMode();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
