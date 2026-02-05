import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, Input, inject, signal, effect, NgZone, Output, EventEmitter } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.heat'; // Side effect import
import { ZoneService } from '../../../admin/services/zone.service';
import { MapService, PublicAlert } from '../../services/map.service';
import { LocationService } from '../../../../core/services/location.service';
import { HeatmapService } from '../../../../core/services/heatmap.service';
import { AppConstants } from '../../../../core/constants/app.constants';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #mapContainer class="w-full h-full bg-slate-950"></div>
    
    <!-- Heatmap Toggle (Top Center) - Adjusted position -->
    <div class="fixed top-40 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-300 pointer-events-auto" [class.opacity-0]="!map">
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
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .custom-popup .leaflet-popup-content-wrapper {
      background: rgba(15, 23, 42, 0.95); /* slate-900 */
      color: white;
      border-radius: 12px;
      padding: 0;
      overflow: hidden;
      border: 1px solid rgba(71,85,105,0.5);
    }
    .custom-popup .leaflet-popup-content {
      margin: 0;
      width: 260px !important;
    }
    .custom-popup .leaflet-popup-tip {
      background: rgba(15, 23, 42, 0.95);
    }
    .custom-popup a.leaflet-popup-close-button {
      color: white;
      font-size: 18px;
    }
    /* Security Radar Marker */
    .radar-marker-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
    }

    /* Inner solid dot */
    .radar-core {
      width: 12px;
      height: 12px;
      background-color: #0ea5e9; /* sky-500 */
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.8);
      z-index: 20;
    }

    /* Rotating scanning beam */
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
    
    /* Pulsing Outer Rings */
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
      0% { transform: scale(0.3); opacity: 0.8; }
      80% { transform: scale(1); opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }
    
    @keyframes pulse-ring-border {
      0% { transform: scale(0.3); opacity: 0.8; border-width: 3px; }
      100% { transform: scale(1.2); opacity: 0; border-width: 0px; }
    }
  `]
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  public map: L.Map | undefined;
  
  private zoneService = inject(ZoneService);
  private mapService = inject(MapService);
  private locationService = inject(LocationService);
  private heatmapService = inject(HeatmapService);
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);
  
  private zonesLayer = new L.FeatureGroup();
  private alertsLayer = new L.FeatureGroup(); 
  private userLayer = new L.FeatureGroup();
  private heatLayer: any; 
  private draggableMarker: L.Marker | null = null; // For manual location selection

  showHeatmap = signal(false);
  isSelectionMode = signal(false); // Manual location selection mode
  selectedLocation = signal<{ lat: number; lng: number } | null>(null);

  @Output() locationSelected = new EventEmitter<{lat: number, lng: number}>();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Effect to update user marker
    effect(() => {
       const pos = this.locationService.currentPosition();
       if (pos && this.map) {
          this.updateUserMarker(pos.coords.latitude, pos.coords.longitude);
       }
    });

    // Effect for selection mode
    effect(() => {
       if (this.isSelectionMode()) {
          this.enableSelectionMode();
       } else {
          this.disableSelectionMode();
       }
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => {
           this.initMap();
        }, 50); // Small delay to ensure container size
      });
    }
  }

  private async initMap(): Promise<void> {
    // Default fallback (Buenos Aires, Argentina)
    let lat = -34.6037; 
    let lng = -58.3816;
    let zoom = 13;

    // Initialize map immediately with default location
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false, 
      attributionControl: false,
      zoomAnimation: true
    }).setView([lat, lng], zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    this.zonesLayer.addTo(this.map);
    this.alertsLayer.addTo(this.map);
    this.userLayer.addTo(this.map);

    // Initialize draggable marker but keep it hidden
    const crosshairIcon = L.divIcon({
        className: 'selection-crosshair',
        html: '<div class="w-2 h-2 bg-transparent"></div>', // Invisible, we use HTML overlay
        iconSize: [20, 20]
    });

    // Load zones and intelligence
    // We execute this inside Angular Zone implicitly by not wrapping promises?
    // No, we are outside Angular. We need to enter zone for UI updates if needed.
    // However, map manipulation can stay outside.
    
    // Load data
    this.loadZones();
    this.loadIntelligence();

    // Try to get location in background
    this.locationService.getCurrentPosition().then(initialPos => {
      if (initialPos && initialPos.coords && this.map) {
        // Fly to user location
        try {
           this.map.flyTo([initialPos.coords.latitude, initialPos.coords.longitude], 15, {
             animate: true,
             duration: 1.5
           });
        } catch (e) {
           console.warn('Map flyTo failed (usually safe to ignore):', e);
        }
      }
    }).catch(err => {
      console.warn('Could not get initial position, using default:', err);
    });

    // Listen to move events for selection
    this.map.on('move', () => {
       if (this.isSelectionMode() && this.map) {
          const center = this.map.getCenter();
          // Update signal inside Zone
          this.ngZone.run(() => {
             this.selectedLocation.set({ lat: center.lat, lng: center.lng });
          });
       }
    });
  }

  updateUserMarker(lat: number, lng: number) {
      if (!this.map) return;
      
      this.userLayer.clearLayers();
      
      // Professional Blue Pulsating Dot
      const userIcon = L.divIcon({
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

      const marker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 });
      this.userLayer.addLayer(marker);
  }

  // Public method needed by parent
  public flyTo(lat: number, lng: number, zoom?: number) {
     if (this.map) {
        this.map.flyTo([lat, lng], zoom || 15, {
           animate: true,
           duration: 1.5
        });
     }
  }

  async loadZones() {
    const layers = await this.zoneService.loadZones();
    if (layers) {
      layers.forEach(l => l.addTo(this.zonesLayer));
    }
  }

  async loadIntelligence() {
    await this.mapService.loadPublicIntelligence();
    
    // 1. Plot Recent Markers
    const alerts = this.mapService.recentAlerts();
    this.renderAlertMarkers(alerts);

    // 2. Load Heatmap from Database
    await this.loadHeatmapData();
  }

  async loadHeatmapData() {
    try {
      const heatmapPoints = await this.heatmapService.getDecayedHeatmap();
      
      if ((L as any).heatLayer && heatmapPoints.length > 0) {
        const heatData = this.heatmapService.toLeafletHeatFormat(heatmapPoints);
        
        this.heatLayer = (L as any).heatLayer(heatData, {
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
        // We do not add it automatically
      }
    } catch (error) {
      console.error('Error loading heatmap:', error);
    }
  }

  toggleHeatmap() {
    if (!this.map) return;
    
    // Toggle signal
    this.showHeatmap.update(v => !v);
    
    if (this.showHeatmap()) {
      if (this.heatLayer) {
         this.heatLayer.addTo(this.map);
         this.toastService.info("Visualizando Mapa de Calor");
      } else {
         this.toastService.warning("No hay suficientes datos para el mapa de calor");
         setTimeout(() => this.showHeatmap.set(false), 2000);
      }
    } else {
      if (this.heatLayer) this.map.removeLayer(this.heatLayer);
    }
  }

  renderAlertMarkers(alerts: PublicAlert[]) {
    this.alertsLayer.clearLayers();

    alerts.forEach(alert => {
       const color = this.getColorForType(alert.type);
       const iconHtml = this.getIconForType(alert.type);

       const marker = L.marker([alert.latitude, alert.longitude], {
         icon: L.divIcon({
           className: 'custom-div-icon',
           html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${color}; font-size: 16px;">${iconHtml}</div>`,
           iconSize: [30, 30],
           iconAnchor: [15, 15]
         })
       });

       // Bind Popup
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
      case 'SOS': return '#ef4444'; // red-500
      case 'ROBO': return '#f97316'; // orange-500
      case 'ACCIDENTE': return '#eab308'; // yellow-500
      case 'INCENDIO': return '#f43f5e'; // rose-500
      case 'sospechoso': return '#8b5cf6'; // violet-500
      default: return '#64748b'; // slate-500
    }
  }

  getIconForType(type: string): string {
    switch (type) {
      case 'SOS': return '🚨';
      case 'ROBO': return '🔫';
      case 'ACCIDENTE': return '💥';
      case 'INCENDIO': return '🔥';
      // Professional Car SVG for Suspicious Activity (often suspicious vehicles)
      case 'sospechoso': return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      `;
      default: return '⚠️';
    }
  }

  formatDate(dateStr: string): string {
     const date = new Date(dateStr);
     const now = new Date();
     const diffMs = now.getTime() - date.getTime();
     const diffMins = Math.floor(diffMs / 60000);
     
     if (diffMins < 60) return `Hace ${diffMins} min`;
     const diffHours = Math.floor(diffMins / 60);
     if (diffHours < 24) return `Hace ${diffHours} h`;
     return date.toLocaleDateString();
  }

  // Selection Mode Methods
  enableSelectionMode() {
     this.isSelectionMode.set(true);
     // Logic is mostly handled in template and map move event
     if (this.map) {
         const center = this.map.getCenter();
         this.selectedLocation.set({ lat: center.lat, lng: center.lng });
     }
  }

  disableSelectionMode() {
     this.isSelectionMode.set(false);
     this.selectedLocation.set(null);
  }

  confirmSelection() {
     const loc = this.selectedLocation();
     if (loc) {
        // Create a mock Position object for the manual location
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
        this.ngZone.run(() => {
          this.locationService.manualPosition.set(manualPos);
          this.locationSelected.emit(loc); // Emit Event
          this.disableSelectionMode();
        });
        this.toastService.success('Ubicación fijada manualmente');
     }
  }

  cancelSelection() {
     this.disableSelectionMode();
  }

  ngOnDestroy() {
     if (this.map) {
        this.map.remove();
     }
  }
}
