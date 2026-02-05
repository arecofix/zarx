import { Component, inject, signal, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../../../core/services/location.service';
import { GeocodingService, GeocodingResult } from '../../../core/services/geocoding.service';

export type LocationMode = 'gps' | 'manual';

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  address: string;
  method: LocationMode;
}

@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-4">
      <h3 class="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span>📍</span> UBICACIÓN DEL INCIDENTE
      </h3>

      <!-- Mode Toggle -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <button
          (click)="setMode('gps')"
          [class.bg-emerald-600]="mode() === 'gps'"
          [class.text-white]="mode() === 'gps'"
          [class.border-emerald-500]="mode() === 'gps'"
          [class.bg-slate-800]="mode() !== 'gps'"
          [class.text-slate-300]="mode() !== 'gps'"
          [class.border-slate-700]="mode() !== 'gps'"
          class="py-3 px-4 rounded-xl border font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span>🛰️</span> GPS Automático
        </button>

        <button
          (click)="setMode('manual')"
          [class.bg-blue-600]="mode() === 'manual'"
          [class.text-white]="mode() === 'manual'"
          [class.border-blue-500]="mode() === 'manual'"
          [class.bg-slate-800]="mode() !== 'manual'"
          [class.text-slate-300]="mode() !== 'manual'"
          [class.border-slate-700]="mode() !== 'manual'"
          class="py-3 px-4 rounded-xl border font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span>📌</span> Marcar en Mapa
        </button>
      </div>

      <!-- GPS Status -->
      @if (mode() === 'gps') {
        <div class="bg-slate-950 rounded-lg p-4 border border-slate-800">
          @if (isLoadingGPS()) {
            <div class="flex items-center gap-3 text-slate-300">
              <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span class="text-sm">Obteniendo ubicación GPS...</span>
            </div>
          } @else if (gpsError()) {
            <div class="flex items-center gap-3 text-red-400">
              <span>⚠️</span>
              <span class="text-sm">{{ gpsError() }}</span>
            </div>
          } @else if (currentLocation()) {
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-emerald-400">
                <span>✓</span>
                <span class="text-sm font-bold">Ubicación obtenida</span>
              </div>
              <div class="text-xs text-slate-400">
                <div>Lat: {{ currentLocation()!.latitude.toFixed(6) }}</div>
                <div>Lng: {{ currentLocation()!.longitude.toFixed(6) }}</div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Manual Mode Instructions -->
      @if (mode() === 'manual') {
        <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div class="flex items-start gap-3 text-blue-300">
            <span class="text-xl">ℹ️</span>
            <div class="text-sm">
              <p class="font-bold mb-1">Instrucciones:</p>
              <p class="text-blue-200">Arrastra el marcador rojo en el mapa para seleccionar la ubicación exacta del incidente.</p>
            </div>
          </div>
        </div>
      }

      <!-- Address Display -->
      @if (address()) {
        <div class="mt-4">
          <label class="block text-[10px] text-slate-400 mb-2 uppercase font-bold">Dirección</label>
          <input
            type="text"
            [value]="address()"
            readonly
            class="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 outline-none"
          />
        </div>
      }

      <!-- Coordinates (Debug) -->
      @if (currentLocation()) {
        <div class="mt-3 text-[10px] text-slate-500 font-mono">
          {{ currentLocation()!.latitude.toFixed(6) }}, {{ currentLocation()!.longitude.toFixed(6) }}
        </div>
      }
    </div>
  `,
  styles: []
})
export class LocationSelectorComponent {
  private locationService = inject(LocationService);
  private geocodingService = inject(GeocodingService);

  // Signals
  mode = signal<LocationMode>('gps');
  currentLocation = signal<{ latitude: number; longitude: number } | null>(null);
  address = signal<string>('');
  isLoadingGPS = signal(false);
  gpsError = signal<string>('');

  // Outputs
  locationSelected = output<SelectedLocation>();
  modeChanged = output<LocationMode>();

  constructor() {
    // Auto-get GPS when mode is GPS
    effect(() => {
      if (this.mode() === 'gps') {
        this.getGPSLocation();
      }
    });

    // Geocode when location changes
    effect(() => {
      const loc = this.currentLocation();
      if (loc) {
        this.geocodeLocation(loc.latitude, loc.longitude);
        this.emitLocation();
      }
    });
  }

  setMode(mode: LocationMode) {
    this.mode.set(mode);
    this.modeChanged.emit(mode);
    
    if (mode === 'gps') {
      this.getGPSLocation();
    }
  }

  async getGPSLocation() {
    this.isLoadingGPS.set(true);
    this.gpsError.set('');

    try {
      const position = await this.locationService.getCurrentPosition();
      
      if (position) {
        this.currentLocation.set({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      } else {
        this.gpsError.set('No se pudo obtener la ubicación. Verifica los permisos.');
      }
    } catch (error: any) {
      this.gpsError.set(error.message || 'Error al obtener ubicación GPS');
    } finally {
      this.isLoadingGPS.set(false);
    }
  }

  updateManualLocation(lat: number, lng: number) {
    this.currentLocation.set({ latitude: lat, longitude: lng });
  }

  async geocodeLocation(lat: number, lng: number) {
    try {
      const result = await this.geocodingService.reverseGeocode(lat, lng);
      
      if (result) {
        this.address.set(this.geocodingService.getFullAddress(result));
      } else {
        this.address.set(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      this.address.set(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }

  private emitLocation() {
    const loc = this.currentLocation();
    if (loc) {
      this.locationSelected.emit({
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: this.address(),
        method: this.mode()
      });
    }
  }

  getLocation(): SelectedLocation | null {
    const loc = this.currentLocation();
    if (!loc) return null;

    return {
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: this.address(),
      method: this.mode()
    };
  }
}
