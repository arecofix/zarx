import { Component, OnInit, OnDestroy, afterNextRender, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { SosButtonComponent } from '../../../emergency/sos-button.component';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, SosButtonComponent],
  template: `
    <!-- MAIN CONTAINER -->
    <div class="relative w-screen h-screen overflow-hidden bg-zarx-dark">
      
      <!-- MAP TARGET -->
      <div id="zarx-map" class="absolute inset-0 z-0"></div>

      <!-- UI OVERLAY: TOP BAR (Status) -->
      <div class="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none flex justify-between items-start bg-linear-to-b from-black/80 to-transparent">
        <div>
          <h1 class="text-xl font-black text-white tracking-tighter drop-shadow-md">ZARX <span class="text-zarx-accent text-xs align-top">SYS</span></h1>
          <div class="flex items-center space-x-2 mt-1">
             <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             <span class="text-[10px] text-gray-300 font-mono tracking-widest uppercase">Connected</span>
          </div>
        </div>
        
        <!-- SIGNAL STATS -->
        <div class="flex flex-col items-end">
           <div class="glass-panel px-3 py-1 rounded border border-white/10">
             <span class="text-[10px] text-zarx-accent font-mono block">ZOOM LVL</span>
             <span class="text-lg font-bold text-white">{{ mapService.zoomLevel() }}</span>
           </div>
        </div>
      </div>

      <!-- FLOATING CONTROLS -->
      <div class="absolute bottom-32 right-4 z-20 flex flex-col gap-4">
        <button (click)="mapService.recenterOnUser()" 
                class="w-12 h-12 rounded-full bg-zarx-secondary border border-gray-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:bg-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <!-- LOADING OVERLAY -->
      @if (mapService.isLoading()) {
        <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-500">
           <div class="flex flex-col items-center">
             <div class="w-12 h-12 border-4 border-zarx-accent border-t-transparent rounded-full animate-spin"></div>
             <p class="mt-4 text-zarx-accent font-mono text-sm animate-pulse">INITIALIZING SATELLITE LINK...</p>
           </div>
        </div>
      }

      <!-- FEATURE: SOS BUTTON -->
      <app-sos-button></app-sos-button>
    </div>
  `,
  styles: [`
    .glass-panel {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
    }
  `]
})
export class MapViewComponent implements OnDestroy {
  mapService = inject(MapService);

  constructor() {
    afterNextRender(() => {
      // Safe to access DOM here
      this.mapService.initMap('zarx-map');
    });
  }

  ngOnDestroy(): void {
    this.mapService.cleanup();
  }
}
