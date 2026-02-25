import { Component, Inject, PLATFORM_ID, OnInit, OnDestroy, ViewChild, ElementRef, NgZone, effect, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppConstants } from '../../../core/constants/app.constants';
import { AdminDashboardUseCase } from './application/admin-dashboard.usecase';
import { IncomingFeedComponent } from './components/incoming-feed/incoming-feed.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IncomingFeedComponent],
  templateUrl: './admin-dashboard.component.html',
  styles: [`
    :host { display: block; }
    /* Leaflet Draw Customization for Dark Mode */
    ::ng-deep .leaflet-draw-toolbar a {
      background-color: #0f172a !important;
      border-color: #334155 !important;
      color: #94a3b8 !important;
    }
    ::ng-deep .leaflet-draw-toolbar a:hover {
      background-color: #1e293b !important;
      color: #fff !important;
    }
    ::ng-deep .leaflet-draw-actions {
      background-color: #0f172a !important;
    }
    ::ng-deep .leaflet-draw-actions li a {
      background-color: #0f172a !important;
      border-left-color: #334155 !important;
      color: #cbd5e1 !important;
    }
    ::ng-deep .leaflet-bar {
      border: 1px solid rgba(255,255,255,0.1) !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5) !important;
    }
  `]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  
  public useCase = inject(AdminDashboardUseCase);
  private ngZone = inject(NgZone);

  public map!: any;
  public drawnItems: any; 
  private resizeListener: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // React to Zone Toggling
    effect(() => {
       if (!this.map) return;
       // The UseCase manages the layer content, but we need to pass the map reference
       this.useCase.toggleZones(this.map);
    });

    // React to Heatmap Toggling
    effect(() => {
       if (!this.map) return;
       this.useCase.toggleHeatmap(this.map);
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.useCase.checkScreenSize(window.innerWidth);
      
      this.initMap();
      this.useCase.loadZones();

      this.ngZone.runOutsideAngular(() => {
        this.resizeListener = () => {
          this.ngZone.run(() => this.useCase.checkScreenSize(window.innerWidth));
        };
        window.addEventListener('resize', this.resizeListener);
      });
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      if (this.resizeListener) {
         window.removeEventListener('resize', this.resizeListener);
      }
      if (this.map) {
         this.map.remove();
      }
    }
  }

  async initMap() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Dynamic Imports
    const L = await import('leaflet'); 

    this.drawnItems = new L.FeatureGroup();

    const lat = AppConstants.CONFIG.LOCATION.DEFAULT_LAT; 
    const lng = AppConstants.CONFIG.LOCATION.DEFAULT_LNG;

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(this.map);

    this.map.addLayer(this.drawnItems);
    
    // Initialize Draw Control for creating Zones
    const drawControl = new (L.Control as any).Draw({
      edit: {
        featureGroup: this.drawnItems,
        remove: true
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#38bdf8'
          }
        },
        marker: false,
        polyline: false,
        circle: false,
        rectangle: false,
        circlemarker: false
      }
    });
    this.map.addControl(drawControl);

    // Event Listeners for Draw
    // @ts-ignore
    this.map.on((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      this.drawnItems.addLayer(layer);
      
      this.useCase.currentDrawingLayer = layer;
      this.useCase.openZoneModal();
    });

    // @ts-ignore
    this.map.on(L.Draw.Event.DELETED, () => {
       this.useCase.currentDrawingLayer = null;
    });

    // Sync Initial State
    if (this.useCase.showZones()) {
        this.useCase.toggleZones(this.map);
    }
    if (this.useCase.showHeatmap()) {
        this.useCase.toggleHeatmap(this.map);
    }
  }

  // Wrappers for Template interactions
  onSaveZone() {
    this.useCase.saveZone(this.drawnItems);
  }

  onCancelZone() {
    this.useCase.closeZoneModal(this.drawnItems);
  }

  // Async wrapper to ensure L is loaded if needed, though this method is called from UI after map init
  async onLocateAlert(loc: {lat: number, lng: number}) {
    if (this.map && loc.lat && loc.lng) {
      this.useCase.dashboardService.playSound();
      
      const L = await import('leaflet'); // Need L for circleMarker

      this.map.flyTo([loc.lat, loc.lng], 18, {
        animate: true,
        duration: 1.5
      });
      
      L.circleMarker([loc.lat, loc.lng], {
        radius: 20,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.4
      }).addTo(this.map).setStyle({ className: 'animate-ping' });
    }
  }
}
