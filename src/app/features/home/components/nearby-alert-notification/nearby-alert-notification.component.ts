import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { LocationService } from '../../../../core/services/location.service';
import { AppConstants } from '../../../../core/constants/app.constants';

interface NeighborAlert {
   id: string; // Report ID
   lat: number;
   lng: number;
   distance: number;
   username: string;
   created_at: string;
}

@Component({
  selector: 'app-nearby-alert-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (currentAlert()) {
       <!-- Diamond Notification Overlay -->
       <div class="fixed top-24 right-4 z-9999 animate-bounce-in">
          <button (click)="expandAlert()" class="w-16 h-16 bg-red-600 rotate-45 border-4 border-white shadow-2xl flex items-center justify-center relative overflow-hidden group hover:scale-105 transition-transform">
             <div class="absolute inset-0 bg-red-700 animate-pulse"></div>
             <div class="-rotate-45 text-white font-black text-xs text-center leading-tight relative z-10">
                SOS<br>
                <span class="text-[9px]">{{ currentAlert()?.distance?.toFixed(0) }}m</span>
             </div>
          </button>
       </div>
    }

    <!-- Full Screen Compass View -->
    @if (isExpanded() && currentAlert()) {
      <div class="fixed inset-0 z-10000 bg-slate-900 text-white flex flex-col">
         <!-- Header -->
         <div class="p-6 bg-red-700 flex justify-between items-center shadow-lg">
             <div>
                <h1 class="text-2xl font-black italic">SOS VECINAL</h1>
                <p class="text-xs text-red-200">AYUDA REQUERIDA A {{ currentAlert()?.distance?.toFixed(0) }} METROS</p>
             </div>
             <button (click)="close()" class="w-10 h-10 bg-black/20 rounded-full flex items-center justify-center">✕</button>
         </div>

         <!-- Body: Map/Compass -->
         <div class="flex-1 relative flex items-center justify-center overflow-hidden">
             <!-- Radar Circles -->
             <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div class="w-64 h-64 border border-red-500 rounded-full animate-ping"></div>
                <div class="w-96 h-96 border border-red-500 rounded-full animate-ping" style="animation-delay: 0.5s"></div>
             </div>

             <!-- Direction Arrow (Simulated Compass) -->
             <div class="relative w-48 h-48 transition-transform duration-500 will-change-transform" [style.transform]="'rotate(' + heading() + 'deg)'">
                 <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" /></svg>
                 </div>
                 <!-- Distance Text -->
                 <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-slate-900/80 p-2 rounded backdrop-blur">
                    <div class="text-3xl font-black font-mono">{{ currentAlert()?.distance?.toFixed(0) }}</div>
                    <div class="text-[10px] text-slate-400">METROS</div>
                 </div>
             </div>
             
             <div class="absolute bottom-10 text-center w-full px-8">
                <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
                   <p class="text-sm text-slate-400 mb-1">Víctima solicita ayuda</p>
                   <p class="text-lg font-bold text-white mb-4">@{{ currentAlert()?.username }}</p>
                   <button class="w-full py-3 bg-emerald-600 rounded-lg font-bold shadow-lg shadow-emerald-900/50">
                      📞 LLAMAR 911
                   </button>
                   <p class="text-[10px] text-slate-500 mt-2">No intervenga si pone su vida en riesgo.</p>
                </div>
             </div>
         </div>
      </div>
    }
  `,
  styles: [`
     @keyframes bounce-in {
       0% { transform: scale(0); }
       60% { transform: scale(1.2); }
       100% { transform: scale(1); }
     }
     .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  `]
})
export class NearbyAlertNotificationComponent implements OnInit, OnDestroy {
  supabase = inject(SupabaseService).client;
  location = inject(LocationService);

  currentAlert = signal<NeighborAlert | null>(null);
  isExpanded = signal(false);
  
  heading = signal(0); // For compass simulation
  
  private realtimeChannel: any;
  private compassInterval: any;

  ngOnInit() {
     this.listenForNearbySOS();
  }

  listenForNearbySOS() {
     const myId = this.supabase.auth.getUser(); // Async?
     
     // Correct way: use stored session
     // Simulating realtime filter: Real app needs PostGIS filter on Insert
     // Or we listen to ALL SOS and filter locally for MVP
     
     this.realtimeChannel = this.supabase
        .channel('sos_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports', filter: 'type=eq.SOS' }, 
        async (payload) => {
           const report = payload.new as any; // Cast to any to safely access properties
           const myPos = await this.location.getCurrentPosition();
           
           if (myPos && report.latitude && report.longitude) {
              const dist = this.calculateDistance(
                 myPos.coords.latitude, 
                 myPos.coords.longitude,
                 report.latitude,
                 report.longitude
              );

              if (dist <= 1000) { // 1km Radius Trigger
                 console.warn('🚨 ALERTA VECINAL CERCANA DETECTADA');
                 this.currentAlert.set({
                    id: report.id,
                    lat: report.latitude,
                    lng: report.longitude,
                    distance: dist,
                    username: 'Vecino', // Fetch actual username if needed
                    created_at: report.created_at
                 });
                 // Play Sound
                 new Audio(AppConstants.ASSETS.AUDIO.URGENT_SIREN).play();
              }
           }
        })
        .subscribe();
  }
  
  expandAlert() {
     this.isExpanded.set(true);
     this.startCompass();
  }

  close() {
     this.isExpanded.set(false);
     this.currentAlert.set(null); // Dismiss
     this.stopCompass();
  }

  // Helper: Haversine
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371e3; // metres
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c;
  }
  
  startCompass() {
     // Mock compass heading updates (Simulating bearing to target relative to north)
     // In real web app, we'd need DeviceOrientationEvent
     if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', this.handleOrientation);
     }
  }

  stopCompass() {
      window.removeEventListener('deviceorientation', this.handleOrientation);
  }

  handleOrientation = (event: DeviceOrientationEvent) => {
     // This is rough. alpha is compass direction (0=North). 
     // We need bearing to target.
     if (!this.currentAlert()) return;
     
     // Calculate bearing from me to target
     // Simulating for now simply by rotating based on alpha
     const alpha = event.alpha || 0;
     this.heading.set(360 - alpha); // Simplified
  };

  ngOnDestroy() {
     if (this.realtimeChannel) this.supabase.removeChannel(this.realtimeChannel);
     this.stopCompass();
  }
}
