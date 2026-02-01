import { Injectable, inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import { LocationService } from '../../../core/services/location.service';

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

    // Try to get single position first
    const pos = await this.locationService.getCurrentPosition();
    if (pos) {
      const { latitude, longitude } = pos.coords;
      this.updateUserLocation(latitude, longitude);
      this.centerMap(latitude, longitude);
      this.isLoading.set(false);
      
      // Start continuous tracking if not already
      if (!this.locationService.isTracking()) {
        this.locationService.startTracking();
      }
    } else {
       // Fallback logic handled by LocationService returning null, but we can center default
       console.info('Using Command Center fallback.');
       this.centerMap(-34.6037, -58.3816);
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
    const iconDefault = L.Icon.Default.prototype as any;
    
    iconDefault._getIconUrl = null; 
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  }

  cleanup() {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }
}
