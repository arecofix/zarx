import { Injectable, signal } from '@angular/core';
import { SosSignal } from '../models/sos.model';

@Injectable({
  providedIn: 'root'
})
export class SosService {
  // Global Critical Signal
  // When active, this should "hijack" the UI
  emergencyActive = signal<SosSignal>({ isActive: false });

  activateLocalEmergency() {
    this.emergencyActive.set({ isActive: true });
    // Block back navigation, keep screen on, etc.
  }

  deactivateLocalEmergency() {
    this.emergencyActive.set({ isActive: false });
  }

  // Admin Methods for War Room
  setVictimTarget(victimId: string, coords: {lat: number, lng: number}) {
     this.emergencyActive.set({ 
        isActive: true, // For admin, this might mean "Focus Mode"
        victimId,
        coords
     });
  }
}
