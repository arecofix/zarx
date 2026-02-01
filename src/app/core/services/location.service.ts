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

  constructor() {
    // Optional: Start tracking immediately if permissions allow
    // this.startTracking(); 
  }

  async getCurrentPosition() {
    if (!isPlatformBrowser(this.platformId)) return null;
    
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true
      });
      this.currentPosition.set(coordinates);
      return coordinates;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown location error';
      this.trackingError.set(errMsg);
      return null;
    }
  }

  async startTracking() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Haptic feedback for start
    await Haptics.impact({ style: ImpactStyle.Light });

    try {
      this.watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000, 
        maximumAge: 0
      }, (position, err) => {
        if (position) {
          this.currentPosition.set(position);
          this.isTracking.set(true);
        }
        if (err) {
          this.trackingError.set(err.message);
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
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  }
}
