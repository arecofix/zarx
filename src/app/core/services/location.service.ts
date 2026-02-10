import { Injectable, signal, inject, PLATFORM_ID, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Geolocation, Position, GeolocationOptions } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

import { AppConstants } from '../constants/app.constants';

const C = AppConstants.CONFIG.LOCATION;

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private platformId = inject(PLATFORM_ID);
  
  // Signals
  currentPosition = signal<Position | null>(null);
  manualPosition = signal<Position | null>(null);
  trackingError = signal<string | null>(null);
  isTracking = signal(false);

  private watchId: string | null = null;
  private lastPosition: Position | null = null;

  constructor() {}

  async getCurrentPosition(): Promise<Position | null> {
    if (!isPlatformBrowser(this.platformId)) return null;

    // 1. Check Cache
    // 1. Check Cache
    if (this.isCacheValid()) {
        return this.lastPosition;
    }

    this.trackingError.set(null);

    // 2. Check Permissions
    const initialPerm = await this.checkPermissions();
    if (!initialPerm) return null;

    // 3. Execution Strategies
    let pos: Position | null = null;
    const isNative = Capacitor.isNativePlatform();

    // Strategy A: Native First (Mobile)
    if (isNative) {
        pos = await this.tryCapacitorNative();
        if (!pos) pos = await this.tryWebHighAccuracy(); // Fallback
    } 
    // Strategy B: Web First (PWA/Desktop)
    else {
        pos = await this.tryWebHighAccuracy();
        if (!pos) pos = await this.tryWebLowAccuracy();
    }

    // 4. Fallback for Dev
    if (!pos && isDevMode()) {
       pos = this.getDevFallback();
    }

    // 5. Final Result
    if (pos) {
        this.cachePosition(pos);
        return pos;
    } else {
        console.error('❌ All location strategies failed.');
        this.trackingError.set("No se pudo obtener la ubicación. Verifique GPS y Permisos.");
        return null;
    }
  }

  // --- Strategies ---

  private async tryWebHighAccuracy(): Promise<Position | null> {
    return this.getWebPosition(true, C.TIMEOUT_HIGH_ACCURACY, C.MAX_AGE_HIGH);
  }

  private async tryWebLowAccuracy(): Promise<Position | null> {
    return this.getWebPosition(false, C.TIMEOUT_LOW_ACCURACY, C.MAX_AGE_LOW);
  }

  private async tryCapacitorNative(): Promise<Position | null> {
    console.info('📍 Intentando GPS Nativo (Capacitor)...');
    try {
        return await Geolocation.getCurrentPosition({
            enableHighAccuracy: true, 
            timeout: C.TIMEOUT_HIGH_ACCURACY, 
            maximumAge: C.MAX_AGE_LOW 
        });
    } catch (err: any) {
         console.warn('Capacitor Geo High Accuracy failed, trying low accuracy');
         // Fallback: Low accuracy native
         try {
            return await Geolocation.getCurrentPosition({
                enableHighAccuracy: false,
                timeout: C.TIMEOUT_LOW_ACCURACY,
                maximumAge: Infinity
            });
         } catch(e) { return null; }
    }
  }

  // --- Helpers ---

  private isCacheValid(): boolean {
    return !!(this.lastPosition && (Date.now() - this.lastPosition.timestamp < C.CACHE_VALIDITY));
  }

  private cachePosition(pos: Position) {
    this.lastPosition = pos;
    this.currentPosition.set(pos);
  }

  private async checkPermissions(): Promise<boolean> {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location === 'denied') {
        this.trackingError.set('Permiso de ubicación denegado.');
        return false;
      }
      return true;
    } catch (e) { 
        return true; // Ignore on web if check fails
    }
  }

  private getWebPosition(enableHighAccuracy: boolean, timeout: number, maxAge: number): Promise<Position | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      
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
               speed: pos.coords.speed
             }
        }),
        (err) => {
          // Silent failure for high accuracy if we have low accuracy fallback
          if (enableHighAccuracy) {
             console.log('📍 High accuracy timed out, trying standard accuracy...');
          } else {
             console.warn('📍 Standard location also failed:', err.message);
          }
          resolve(null);
        },
        { enableHighAccuracy, timeout, maximumAge: maxAge }
      );
    });
  }

  private getDevFallback(): Position {
       console.info('ℹ️ Modo Desarrollo: Utilizando ubicación simulada (Falla de GPS)');
        return {
            timestamp: Date.now(),
            coords: {
                latitude: C.DEFAULT_LAT,
                longitude: C.DEFAULT_LNG,
                accuracy: 50,
                altitude: 20,
                altitudeAccuracy: 10,
                heading: 0,
                speed: 0
            }
        };
  }

  // --- Tracking ---

  async startTracking() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      this.stopTracking(); 

      this.watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: C.TIMEOUT_LOW_ACCURACY, 
        maximumAge: 5000 
      }, (position, err) => {
        if (position) {
          this.cachePosition(position);
          this.isTracking.set(true);
        }
        if (err) {
          // Ignore timeout repeats in tracking
          if ((err as any).code === 3) return;
          console.warn('Tracking update warning:', err.message);
        }
      });
    } catch(e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown tracking error';
      this.trackingError.set(errMsg);
    }
  }

  async stopTracking() {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
      this.isTracking.set(false);
    }
  }
}
