import { Component, Inject, inject, OnInit, OnDestroy, PLATFORM_ID, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-public-tracking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-screen h-screen bg-slate-950 overflow-hidden">
      
      <!-- MAP -->
      <div #mapContainer class="w-full h-full z-0"></div>
      
      <!-- HEADER OVERLAY -->
      <div class="absolute top-0 left-0 right-0 z-20 p-4 bg-linear-to-b from-slate-900/90 to-transparent">
         <div class="flex items-center gap-3 bg-slate-800/80 backdrop-blur rounded-full p-2 pr-6 w-fit mx-auto border border-slate-600 shadow-xl">
             <div class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
                <span class="text-xl">🛡️</span>
             </div>
             <div>
                <div class="text-xs text-emerald-400 font-bold tracking-widest uppercase">ZARX GUARDIAN</div>
                <div class="text-white font-bold text-sm">Monitoreo en Vivo</div>
             </div>
         </div>
      </div>

      <!-- STATES -->
      @if (loading()) {
        <div class="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/50 backdrop-blur">
           <div class="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      }

      @if (ended()) {
         <div class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-900/95 p-8 text-center animate-fade-in">
             <div class="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
             </div>
             <h2 class="text-3xl font-black text-white mb-2">LLEGÓ A DESTINO</h2>
             <p class="text-slate-400">La sesión de monitoreo ha finalizado correctamente.</p>
             <a href="/" class="mt-8 px-6 py-3 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold border border-slate-700 hover:text-white">Ir a ZARX</a>
         </div>
      }

      @if (error()) {
        <div class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-red-950/95 p-8 text-center">
            <h2 class="text-2xl font-bold text-red-500 mb-2">Enlace Expirado</h2>
            <p class="text-red-200">Esta sesión no existe o ya ha terminado.</p>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class PublicTrackingComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService).client;
  
  private map: L.Map | undefined;
  private marker: L.Marker | undefined;
  private pathLine: L.Polyline | undefined;
  private pathPoints: L.LatLngExpression[] = [];

  sessionId: string | null = null;
  loading = signal(true);
  ended = signal(false);
  error = signal(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId');
    
    if (isPlatformBrowser(this.platformId) && this.sessionId) {
      this.initMap();
      this.subscribeToSession(this.sessionId);
    } else {
       this.error.set(true);
       this.loading.set(false);
    }
  }

  private initMap() {
    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: false }).setView([0, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(this.map);
    
    this.pathLine = L.polyline([], { color: '#10b981', weight: 4, opacity: 0.7 }).addTo(this.map);
  }

  private async subscribeToSession(id: string) {
    // 1. Fetch Initial Data
    const { data, error } = await this.supabase
       .from('active_tracking_sessions')
       .select('*')
       .eq('id', id)
       .single();

    if (error || !data) {
       this.error.set(true);
       this.loading.set(false);
       return;
    }

    if (!data.is_active) {
       this.ended.set(true);
       this.loading.set(false);
       return;
    }

    this.updatePosition(data.current_lat, data.current_lng);
    this.loading.set(false);

    // 2. Realtime Subscription
    this.supabase
      .channel(`tracking:${id}`)
      .on('postgres_changes', { 
         event: 'UPDATE', 
         schema: 'public', 
         table: 'active_tracking_sessions', 
         filter: `id=eq.${id}` 
      }, (payload: any) => {
         const newData = payload.new;
         if (!newData.is_active) {
            this.ended.set(true);
         } else {
            this.updatePosition(newData.current_lat, newData.current_lng);
         }
      })
      .subscribe();
  }

  private updatePosition(lat: number, lng: number) {
    if (!this.map) return;

    const newLatLng = new L.LatLng(lat, lng);
    
    // Add to path
    this.pathPoints.push(newLatLng);
    this.pathLine?.setLatLngs(this.pathPoints);

    // Update Marker
    if (!this.marker) {
       const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 20px #10b981;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
       });
       this.marker = L.marker(newLatLng, { icon }).addTo(this.map);
       this.map?.setView(newLatLng, 15);
    } else {
       this.marker.setLatLng(newLatLng);
       this.map?.panTo(newLatLng);
    }
  }

  ngOnDestroy() {
    if (this.sessionId) {
       this.supabase.removeChannel(this.supabase.channel(`tracking:${this.sessionId}`));
    }
    this.map?.remove();
  }
}
