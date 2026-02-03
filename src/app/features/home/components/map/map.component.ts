import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, Input, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import { ZoneService } from '../../../admin/services/zone.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #mapContainer class="w-full h-full bg-slate-950"></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  private map: L.Map | undefined;
  
  private zoneService = inject(ZoneService);
  private zonesLayer = new L.FeatureGroup();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Small timeout to ensure container has dimensions after route transition
      setTimeout(() => {
        this.initMap();
        this.map?.invalidateSize();
      }, 100);
    }
  }

  private async initMap(): Promise<void> {
    // Coordenadas dummy (Marcos Paz, Argentina)
    const lat = -34.77; 
    const lng = -58.83;

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false, // We'll add custom controls if needed or keep it clean
      attributionControl: false
    }).setView([lat, lng], 13);

    // Dark Mode Tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    // Feature Groups
    this.zonesLayer.addTo(this.map);

    // Add a marker for context
    const customIcon = L.icon({
      iconUrl: 'assets/marker-icon.png', // Fallback or standard
      shadowUrl: 'assets/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Fix for default leaflet icons in webpack/angular if needed, 
    // but usually assets in angular.json handles it. 
    // We'll just use a circle for "Center of Command" feel
    L.circle([lat, lng], {
      color: '#3b82f6', // Blue-500
      fillColor: '#3b82f6',
      fillOpacity: 0.5,
      radius: 500
    }).addTo(this.map);
    
    L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#10b981', // Emerald-500
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(this.map).bindPopup("Comando Central ZARX");

    // Load Zones
    await this.loadZones();
  }

  async loadZones() {
    const layers = await this.zoneService.loadZones();
    if (layers && layers.length > 0) {
      layers.forEach(layer => {
        layer.addTo(this.zonesLayer);
        // Optional: Add popup with zone info for users
        if ((layer as any).feature?.properties) {
           const p = (layer as any).feature.properties;
           layer.bindPopup(`
             <div class="font-mono text-slate-900">
               <strong class="block text-sm mb-1">${p.name}</strong>
               <span class="text-xs px-2 py-0.5 rounded text-white ${this.getBadgeClass(p.type)}">${p.type}</span>
               <div class="text-[10px] mt-1 text-slate-500">Riesgo: ${p.risk_level}%</div>
             </div>
           `);
        }
      });
    }
  }

  getBadgeClass(type: string): string {
    switch(type) {
      case 'SAFE': return 'bg-emerald-600';
      case 'DANGER': return 'bg-red-600';
      case 'BLOCKED': return 'bg-slate-600';
      case 'COMMERCIAL': return 'bg-blue-600';
      default: return 'bg-yellow-600';
    }
  }

  flyTo(lat: number, lng: number) {
    if (this.map) {
      this.map.flyTo([lat, lng], 15, { // Zoom level 15 good for street level
        animate: true,
        duration: 2 // Smooth long flight
      });
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}
