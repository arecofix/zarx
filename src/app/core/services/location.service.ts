import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private platformId = inject(PLATFORM_ID);
  
  // Signals
  currentPosition = signal<Position | null>(null);
  trackingError = signal<string | null>(null);
  isTracking = signal(false);

  private watchId: string | null = null;
  private lastPosition: Position | null = null;

  constructor() {}

  async getCurrentPosition(): Promise<Position | null> {
    if (!isPlatformBrowser(this.platformId)) return null;

    // Return cached if very recent (e.g. < 10 seconds)
    if (this.lastPosition && (Date.now() - this.lastPosition.timestamp < 10000)) {
        return this.lastPosition;
    }

    this.trackingError.set(null);

    // 0. Check Permissions 
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location === 'denied') {
        this.trackingError.set('Permiso de ubicación denegado.');
        return null;
      }
    } catch (e) { /* Ignore permission check errors on web */ }
    
    // Helper: Standard API Promisified
    const getWebPosition = (enableHighAccuracy: boolean, timeout: number): Promise<Position | null> => {
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
             console.warn(`Web Geo (${enableHighAccuracy ? 'High' : 'Low'}) failed:`, err.message);
             resolve(null);
           },
           { enableHighAccuracy, timeout, maximumAge: 30000 }
         );
       });
    };

    // STRATEGY 1: Web Standard (High Accuracy) - Fast attempt
    console.log('📍 Trying Web GPS (High Accuracy)...');
    let pos = await getWebPosition(true, 7000); // 7s timeout

    // STRATEGY 2: Web Standard (Low Accuracy / WiFi / Cell) - Fallback
    if (!pos) {
        console.log('📍 Trying Web GPS (Low Accuracy)...');
        pos = await getWebPosition(false, 10000); // 10s timeout
    }

    // STRATEGY 3: Capacitor Native Bridge (Usually forces provider)
    if (!pos) {
        console.log('📍 Trying Capacitor Native...');
        try {
            const nativePos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true, // Try high accuracy natively first
                timeout: 10000,
                maximumAge: 0
            });
            pos = nativePos;
        } catch (err: any) {
             console.warn('Capacitor Geo High failed, trying low:', err.message);
             try {
                // Last resort native low
                pos = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: Infinity
                });
             } catch(e) {}
        }
    }

    // RESULT
    if (pos) {
        console.log('✅ Location acquired:', pos.coords.latitude, pos.coords.longitude);
        this.lastPosition = pos;
        this.currentPosition.set(pos);
        return pos;
    } else {
        console.error('❌ All location strategies failed.');
        this.trackingError.set("No se pudo obtener la ubicación. Verifique GPS y Permisos.");
        return null;
    }
  }

  async startTracking() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Haptic feedback for start
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch {} 

    try {
      // Clear existing watch if any
      this.stopTracking();

      this.watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 20000, 
        maximumAge: 0
      }, (position, err) => {
        if (position) {
          this.currentPosition.set(position);
          this.lastPosition = position;
          this.isTracking.set(true);
        }
        if (err) {
          console.warn('Tracking error:', err);
          // Don't set global error immediately on intermittent tracking fails
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
