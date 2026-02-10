import { Component, Inject, PLATFORM_ID, OnInit, signal, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet.heat'; 
import { AppConstants } from '../../../core/constants/app.constants';
// Note: leaflet-draw is usually imported via side-effects or L.Control.Draw references.
// We might need to ensure 'leaflet-draw' is loaded.
import 'leaflet-draw'; 
import { Router } from '@angular/router';

import { ZoneService, Zone } from '../services/zone.service';
import { ReportService } from '../../../core/services/report.service';

import { IncomingFeedComponent } from './components/incoming-feed/incoming-feed.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IncomingFeedComponent],
  templateUrl: './admin-dashboard.component.html',
  styles: [`
    :host { display: block; }
    /* Leaflet Draw Customization for Dark Mode */
    ::ng-deep .leaflet-draw-toolbar a {
      background-color: #0f172a !important; /* Slate-900 */
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
export class AdminDashboardComponent implements OnInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  
  // STATE SIGNALS
  sidebarOpen = signal(true);
  feedOpen = signal(true); // Right sidebar
  showHeatmap = signal(false);
  showZones = signal(true);
  showZoneModal = signal(false);
  
  // DATA
  zones = signal<Zone[]>([]);
  newZoneData: Partial<Zone> = { name: '', risk_level: 50, type: 'DANGER' };
  currentLayer: any = null; // Layer being drawn
  
  private map!: L.Map;
  private heatLayer: any;
  private drawnItems = new L.FeatureGroup();
  private zonesLayer = new L.FeatureGroup();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object, 
    private zoneService: ZoneService,
    private router: Router,
    private reportService: ReportService
  ) {}

  goToHome() {
    this.router.navigate(['/inicio']);
  }

  goToZones() {
    this.router.navigate(['/admin/zones']);
  }

  goToUsers() {
    this.router.navigate(['/admin/users']);
  }

  goToNews() {
    this.router.navigate(['/admin/news']);
  }

  goToReports() {
    this.router.navigate(['/admin/reports']);
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
      
      this.initMap();
      this.loadZones();

      // Listen for resize changes (debounced ideally, but simple for now)
      window.addEventListener('resize', () => {
         // Optionally we can auto-collapse on resize, but usually user intent matters more after load.
         // For now, let's just ensure if they resize to mobile, we might check constraints.
         // But checking on init is most important for "first load" experience.
      });
    }
  }

  checkScreenSize() {
      // Mobile Breakpoint (md: 768px)
      if (window.innerWidth < 768) {
         this.sidebarOpen.set(false);
         this.feedOpen.set(false);
      } else {
         this.sidebarOpen.set(true);
         this.feedOpen.set(true);
      }
  }

  initMap() {
    const lat = AppConstants.CONFIG.LOCATION.DEFAULT_LAT; 
    const lng = AppConstants.CONFIG.LOCATION.DEFAULT_LNG;

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 13);

    // Dark Map Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(this.map);

    // Feature Groups
    this.map.addLayer(this.drawnItems);
    this.map.addLayer(this.zonesLayer);

    // Feature Groups
    this.map.addLayer(this.drawnItems);
    this.map.addLayer(this.zonesLayer);
    
    // Note: Zone editing moved to dedicated ZoneEditorComponent (/admin/zones)
  }

  // --- HEATMAP ---
  async toggleHeatmap() {
    this.showHeatmap.update(v => !v);
    
    if (this.showHeatmap()) {
      if (!this.heatLayer) {
        // Fetch Real Data
        try {
          const rawData = await this.reportService.getHeatmapData();
          // Transform { latitude, longitude, intensity } -> [lat, lng, intensity]
          const points = rawData.map(d => [d.latitude, d.longitude, d.intensity]);
          
          // @ts-ignore
          this.heatLayer = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 17 }).addTo(this.map);
        } catch (e) {
           console.error('Heatmap error', e);
        }
      } else {
        this.heatLayer.addTo(this.map);
      }
    } else {
      if (this.heatLayer) this.heatLayer.remove();
    }
  }

  // --- ZONES ---
  toggleZones() {
    this.showZones.update(v => !v);
    if (this.showZones()) {
      this.zonesLayer.addTo(this.map);
    } else {
      this.zonesLayer.remove();
    }
  }

 async loadZones() {
    // Clean previous layers
    this.zonesLayer.clearLayers();
    
    // Call service which now returns ready-to-use Leaflet layers
    const layers = await this.zoneService.loadZones();
    
    if (layers && layers.length > 0) {
       layers.forEach((layer: any) => {
         // Add to map layer group
         layer.addTo(this.zonesLayer);
       });

       // Update local signal for the sidebar list
       // Extract properties from the features attached to layers
       const zonesData = layers.map((l: any) => l.feature.properties as Zone);
       this.zones.set(zonesData);
    }
  }

  // --- MODAL & SAVING ---
  openZoneModal() {
    this.newZoneData = { name: '', risk_level: 50, type: 'DANGER' };
    this.showZoneModal.set(true);
  }

  cancelZone() {
    this.showZoneModal.set(false);
    if (this.currentLayer) {
      this.drawnItems.removeLayer(this.currentLayer);
      this.currentLayer = null;
    }
  }

  async saveZone() {
    if (!this.currentLayer) return;

    const metadata = {
      name: this.newZoneData.name!,
      risk_level: this.newZoneData.risk_level!,
      type: this.newZoneData.type!
    };

    // Apply color locally immediately for better UX
    const color = this.getColorByType(metadata.type);
    this.currentLayer.setStyle({ color: color, fillColor: color });

    // Call service to save to Supabase
    const { data, error } = await this.zoneService.saveZone(this.currentLayer, metadata);

    if (!error) {
       console.log('Zone saved successfully:', data);
       
       // Reload zones to ensure sync with DB (ID generation, etc)
       // Or optimistic update if performance is critical, but reload is safer for IDs
       this.loadZones();

       this.showZoneModal.set(false);
       this.currentLayer = null; 
       // Note: currentLayer is still in drawnItems, but loadZones() might add it to zonesLayer.
       // Ideally we should move it or clear drawnItems. 
       // For now, let's clear drawnItems to avoid duplication since loadZones will fetch it back.
       this.drawnItems.clearLayers();
    } else {
       console.error('Error saving zone:', error);
       alert('Error al guardar la zona. Intente nuevamente.');
    }
  }

  getColorByType(type: string): string {
    switch(type) {
      case 'SAFE': return '#10b981'; // Emerald
      case 'DANGER': return '#ef4444'; // Red
      case 'BLOCKED': return '#64748b'; // Slate
      case 'COMMERCIAL': return '#3b82f6'; // Blue
      default: return '#fbbf24';
    }
  }

  onLocateAlert(loc: {lat: number, lng: number}) {
    if (this.map && loc.lat && loc.lng) {
      this.map.flyTo([loc.lat, loc.lng], 18, {
        animate: true,
        duration: 1.5
      });
      
      // Optional: Add a temporary marker or pulse effect
      L.circleMarker([loc.lat, loc.lng], {
        radius: 20,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.4
      }).addTo(this.map).setStyle({ className: 'animate-ping' }); // Would need css for animate-ping on svg
    }
  }
}
