import { Injectable, inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import { LocationService } from '../../../core/services/location.service';

import { Alert } from '../../../core/models/index';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private platformId = inject(PLATFORM_ID);
  private map: L.Map | undefined;
  private userMarker: L.Marker | undefined;
  
  locationService = inject(LocationService);

  // --- SIGNALS STATE ---
  isLoading = signal<boolean>(true);
  zoomLevel = signal<number>(13);
  userLocation = signal<{ lat: number; lng: number } | null>(null);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.fixLeafletIcons();
    
    // Effect to update map when location changes
    effect(() => {
      const pos = this.locationService.currentPosition();
      if (pos && this.map) {
         const { latitude, longitude } = pos.coords;
         this.updateUserLocation(latitude, longitude);
      }
    });
  }

  initMap(elementId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. Define Dark Matter Tiles
    const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    });

    // 2. Initialize Map instance
    this.map = L.map(elementId, {
      center: [-34.6037, -58.3816], // Default Center
      zoom: this.zoomLevel(),
      layers: [darkTiles],
      zoomControl: false, // We will build custom UI
      attributionControl: false 
    });

    // 3. Add Listeners for Zoneless Updates
    this.map.on('moveend', () => {
      this.zoomLevel.set(this.map!.getZoom());
    });

    this.map.on('load', () => {
      this.isLoading.set(false);
    });
    
    setTimeout(() => {
        this.isLoading.set(false);
        this.map?.invalidateSize();
    }, 500);

    // 4. Initial Geolocation
    this.locateUser();
  }
  async locateUser() {
    if (!this.map) return;
    this.isLoading.set(true);

    try {
      // Try to get single position first (improved LocationService logic inside)
      const pos = await this.locationService.getCurrentPosition();
      
      if (pos) {
        const { latitude, longitude } = pos.coords;
        this.updateUserLocation(latitude, longitude);
        this.centerMap(latitude, longitude);
        
        // Start continuous tracking if not already
        if (!this.locationService.isTracking()) {
          this.locationService.startTracking();
        }
      } else {
         console.warn('Could not acquire location. Using default fallback.');
         this.errorMessage.set('Could not detect location. Using Default View.');
         this.centerMap(-34.6037, -58.3816);
      }
    } catch (err) {
      console.error('locateUser unexpected error:', err);
      // Fallback on crash
      this.errorMessage.set('GPS Error. Using Default View.');
      this.centerMap(-34.6037, -58.3816);
    } finally {
      this.isLoading.set(false);
    }
  }

  updateUserLocation(lat: number, lng: number) {
    if (!this.map) return;
    
    this.userLocation.set({ lat, lng });

    // Custom Pulsating Dot Icon
    const pulseIcon = L.divIcon({
      className: 'user-marker-pulse',
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
          <span class="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-sky-400"></span>
          <span class="relative inline-flex w-3 h-3 rounded-full bg-sky-500 border-2 border-white"></span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lng]);
      this.userMarker.setIcon(pulseIcon);
    } else {
      this.userMarker = L.marker([lat, lng], { icon: pulseIcon }).addTo(this.map);
    }
  }

  centerMap(lat: number, lng: number) {
    if (this.map) {
      this.map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
    }
  }

  recenterOnUser() {
    const loc = this.userLocation();
    if (loc) {
      this.centerMap(loc.lat, loc.lng);
    } else {
      this.locateUser();
    }
  }

  private fixLeafletIcons() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    
    // Type assertion to bypass readonly property check or strictly typed issues
    const iconDefault = L.Icon.Default.prototype as { _getIconUrl?: () => string };
    
    // @ts-ignore: delete generic is not standard but required for leaflet fix
    delete iconDefault._getIconUrl; 
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  }

  // --- ALERT MARKERS ---
  private alertMarkers: Map<string, L.Marker> = new Map();

  addAlertMarker(alert: Alert) { 
     if (!this.map) return;
     
     // Parse Location POINT(lng lat)
     // Format: "POINT(-58.123 -34.123)"
     const matches = alert.location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
     if (!matches) return;
     
     const lng = parseFloat(matches[1]);
     const lat = parseFloat(matches[2]);

     // Determine Styling based on Alert Type
     let colorClass = 'bg-orange-500';
     let pulseClass = 'bg-orange-600';
     let ringClass = 'border-white';

     switch (alert.type) {
        case 'SOS':
          colorClass = 'bg-red-600';
          pulseClass = 'bg-red-500';
          break;
        case 'FIRE':
          colorClass = 'bg-orange-600';
          pulseClass = 'bg-orange-500';
          break;
        case 'MEDICAL':
          // Green/Emerald for medical
          colorClass = 'bg-emerald-600';
          pulseClass = 'bg-emerald-500';
          break;
        case 'MILITARY_OPS':
          // Tactical Slate/Dark
          colorClass = 'bg-slate-700';
          pulseClass = 'bg-slate-500';
          break;
        case 'SUSPICIOUS_ACTIVITY':
          // Yellow/Amber
          colorClass = 'bg-yellow-500';
          pulseClass = 'bg-yellow-400';
          ringClass = 'border-yellow-200';
          break;
     }

     const isCritical = alert.type === 'SOS';
     
     const alertIcon = L.divIcon({
       className: 'alert-marker',
       html: `
         <div class="relative flex items-center justify-center w-8 h-8">
           <span class="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping ${pulseClass}"></span>
           <span class="relative inline-flex w-4 h-4 rounded-full ${colorClass} border-2 ${ringClass} shadow-lg"></span>
         </div>
       `,
       iconSize: [32, 32],
       iconAnchor: [16, 16]
     });

     const marker = L.marker([lat, lng], { icon: alertIcon }).addTo(this.map!);
     marker.bindPopup(`
        <div class="text-slate-900 min-w-[150px]">
           <div class="flex items-center gap-2 mb-1">
              <span class="w-2 h-2 rounded-full ${colorClass}"></span>
              <strong class="text-sm font-bold uppercase">${alert.type.replace('_', ' ')}</strong>
           </div>
           <p class="text-xs text-slate-600 m-0 leading-tight">${alert.description || 'Sin descripción'}</p>
            <p class="text-[10px] text-slate-400 mt-2 border-t pt-1 border-slate-200">
              ${alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : 'Hora desconocida'} • Priority: ${alert.priority || 'NORMAL'}
            </p>
         </div>
      `);

      if (alert.id) {
         this.alertMarkers.set(alert.id, marker);
      }
     
     // Fly to critical alerts
     if (isCritical) {
         this.map.flyTo([lat, lng], 17, { animate: true });
     }
  }

  clearAlertMarkers() {
    this.alertMarkers.forEach(m => m.remove());
    this.alertMarkers.clear();
  }

  cleanup() {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
    this.locationService.stopTracking();
    this.clearAlertMarkers();
    this.userLocation.set(null);
    this.isLoading.set(true);
  }
}
