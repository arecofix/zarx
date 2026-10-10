import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { Logger } from '../utils/logger';
import { AppConstants } from '../constants/app.constants';

export const MARCOS_PAZ_DEFAULT: { latitude: number; longitude: number } = {
  latitude: AppConstants.CONFIG.LOCATION.DEFAULT_LAT,
  longitude: AppConstants.CONFIG.LOCATION.DEFAULT_LNG
};

export function createMarcosPazPosition(): Position {
  return {
    timestamp: Date.now(),
    coords: {
      latitude: MARCOS_PAZ_DEFAULT.latitude,
      longitude: MARCOS_PAZ_DEFAULT.longitude,
      accuracy: 100,
      altitude: 25,
      altitudeAccuracy: 10,
      heading: 0,
      speed: 0,
      magneticHeading: null,
      trueHeading: null,
      headingAccuracy: null,
      course: null
    }
  };
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private platformId = inject(PLATFORM_ID);
  
  // Signals: Seeded with Marcos Paz to ensure immediate, deterministic coordinates
  currentPosition = signal<Position>(createMarcosPazPosition());
  manualPosition = signal<Position | null>(null);
  trackingError = signal<string | null>(null);
  isTracking = signal(false);

  private watchId: string | null = null;
  private lastPosition: Position | null = null;
  private readonly CACHE_TTL_MS = 30000; // 30s cache

  constructor() {}

  /**
   * Resilient, guaranteed position resolver.
   * Fallback chain: Cache -> Native GPS -> Web High Accuracy -> Web Standard -> Marcos Paz Default.
   * Always emits and returns a valid Position object.
   */
  async getCurrentPosition(): Promise<Position> {
    if (!isPlatformBrowser(this.platformId)) {
      return createMarcosPazPosition();
    }

    // 1. Cache Check
    if (this.isCacheValid()) {
      return this.lastPosition!;
    }

    this.trackingError.set(null);

    let pos: Position | null = null;
    const isNative = Capacitor.isNativePlatform();

    // 2. Strategy: Native First (Mobile)
    if (isNative) {
      pos = await this.tryCapacitorNative();
      if (!pos) {
        pos = await this.tryWebHighAccuracy();
      }
    } else {
      // Strategy: Web First (PWA / Browser)
      pos = await this.tryWebHighAccuracy();
      if (!pos) {
        pos = await this.tryWebStandard();
      }
    }

    // 3. Fallback: Marcos Paz Default (Guaranteed)
    if (!pos) {
      Logger.info('📍 Fallback activo: Estableciendo base de operaciones Marcos Paz (-34.7647, -58.8397)');
      pos = createMarcosPazPosition();
    }

    this.cachePosition(pos);
    return pos;
  }

  private isCacheValid(): boolean {
    return !!(this.lastPosition && (Date.now() - this.lastPosition.timestamp < this.CACHE_TTL_MS));
  }

  private cachePosition(pos: Position) {
    this.lastPosition = pos;
    this.currentPosition.set(pos);
  }

  private async tryCapacitorNative(): Promise<Position | null> {
    try {
      return await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 10000
      });
    } catch (_) {
      try {
        return await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: Infinity
        });
      } catch {
        return null;
      }
    }
  }

  private tryWebHighAccuracy(): Promise<Position | null> {
    return this.getWebPosition(true, 5000, 10000);
  }

  private tryWebStandard(): Promise<Position | null> {
    return this.getWebPosition(false, 6000, Infinity);
  }

  private getWebPosition(enableHighAccuracy: boolean, timeout: number, maxAge: number): Promise<Position | null> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          timestamp: pos.timestamp,
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            magneticHeading: null,
            trueHeading: null,
            headingAccuracy: null,
            course: null
          }
        }),
        (err) => {
          Logger.debug(`[LocationService] Geolocation (${enableHighAccuracy ? 'high' : 'standard'}) failed: ${err.message}`);
          resolve(null);
        },
        { enableHighAccuracy, timeout, maximumAge: maxAge }
      );
    });
  }

  async startTracking(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      await this.stopTracking();

      this.watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }, (position, err) => {
        if (position) {
          this.cachePosition(position);
          this.isTracking.set(true);
        }
        if (err && (err as any).code !== 3) {
          console.warn('[LocationService] Watch warning:', err.message);
        }
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown tracking error';
      this.trackingError.set(errMsg);
    }
  }

  async stopTracking(): Promise<void> {
    if (this.watchId) {
      try {
        await Geolocation.clearWatch({ id: this.watchId });
      } catch (_) {}
      this.watchId = null;
      this.isTracking.set(false);
    }
  }
}
