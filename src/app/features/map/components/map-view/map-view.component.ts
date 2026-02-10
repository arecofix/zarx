import { Component, OnInit, OnDestroy, afterNextRender, inject, signal, effect } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { PanicButtonComponent } from '../../../../shared/components/panic-button/panic-button.component';
import { AuthService } from '../../../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { warningOutline } from 'ionicons/icons';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, PanicButtonComponent, RouterModule],
  template: `
    <!-- MAIN CONTAINER -->
    <div class="relative w-screen h-screen overflow-hidden bg-zarx-dark">
      
      <!-- MAP TARGET -->
      <div id="zarx-map" class="absolute inset-0 z-0"></div>

      <!-- UI OVERLAY: TOP BAR -->
      <div class="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none flex justify-between items-start bg-linear-to-b from-black/80 to-transparent">
        
        <!-- BRAND -->
        <a routerLink="/" class="pointer-events-auto block cursor-pointer active:scale-95 transition-transform">
          <h1 class="text-xl font-black text-white tracking-tighter drop-shadow-md">ZARX <span class="text-blue-500 text-xs align-top">SYS</span></h1>
          <div class="flex items-center space-x-2 mt-1">
             <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             <span class="text-[10px] text-gray-300 font-mono tracking-widest uppercase">Connected</span>
          </div>
        </a>
        
        <!-- RIGHT SIDE: HAMBURGER & STATS -->
        <div class="flex flex-col items-end gap-2 pointer-events-auto">
           
           <!-- HAMBURGER BUTTON -->
           <button (click)="toggleMenu()" class="p-2 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-lg text-white hover:bg-slate-800 transition-colors active:scale-95">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
             </svg>
           </button>

           <!-- STATS (Optional, hidden if menu open maybe?) -->
           <div class="glass-panel px-3 py-1 rounded border border-white/10">
             <span class="text-[10px] text-blue-400 font-mono block">ZOOM</span>
             <span class="text-lg font-bold text-white">{{ mapService.zoomLevel() }}</span>
           </div>
        </div>
      </div>

      <!-- SIDE MENU (OFF-CANVAS) -->
      <div *ngIf="isMenuOpen()" class="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in" (click)="toggleMenu()"></div>
      
      <div class="absolute top-0 right-0 bottom-0 z-50 w-64 bg-slate-900 border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out p-6 flex flex-col"
           [class.translate-x-0]="isMenuOpen()"
           [class.translate-x-full]="!isMenuOpen()">
          
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-xl font-bold text-white tracking-tight">MENU</h2>
            <button (click)="toggleMenu()" class="text-slate-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav class="flex-1 space-y-4">
             <button (click)="openProfile()" class="w-full flex items-center space-x-3 text-slate-300 hover:text-blue-400 hover:bg-slate-800/50 p-2 rounded-lg transition-colors group">
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
               <span class="font-medium">My Profile</span>
             </button>
             
             <button (click)="openSettings()" class="w-full flex items-center space-x-3 text-slate-300 hover:text-blue-400 hover:bg-slate-800/50 p-2 rounded-lg transition-colors group">
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
               <span class="font-medium">Settings</span>
             </button>
          </nav>

          <div class="pt-6 border-t border-slate-800">
             <button (click)="logout()" class="w-full flex items-center space-x-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
               <span class="font-medium">Log Out</span>
             </button>
          </div>
      </div>

      <!-- QUICK DIAL & CONTROLS (DESKTOP FLOATING) -->
      <div class="hidden md:flex absolute bottom-8 left-4 z-20 flex-col gap-3">
        <a href="tel:911" class="w-12 h-12 rounded-full bg-blue-600 border border-blue-400/50 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
          <span class="font-black text-xs">911</span>
        </a>
        <a href="tel:107" class="w-12 h-12 rounded-full bg-emerald-600 border border-emerald-400/50 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </a>
        <a href="tel:100" class="w-12 h-12 rounded-full bg-orange-600 border border-orange-400/50 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>
        </a>
      </div>

      <div class="hidden md:flex absolute bottom-8 right-4 z-20 flex-col gap-4">
        <button (click)="mapService.recenterOnUser()" 
                class="w-12 h-12 rounded-full bg-slate-800 border border-gray-600 text-white shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <!-- MOBILE BOTTOM BAR (VISIBLE ON SMALL SCREENS) -->
      <div class="md:hidden absolute bottom-0 left-0 right-0 z-30 pb-safe-area bg-linear-to-t from-black/90 to-transparent p-4 flex justify-between items-end pointer-events-none">
          <!-- Left: Quick Dial -->
          <div class="bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10 flex flex-col gap-2 pointer-events-auto">
             <a href="tel:911" class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg active:scale-95"><span class="font-bold text-[10px]">911</span></a>
             <a href="tel:107" class="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg active:scale-95"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></a>
             <a href="tel:100" class="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-lg active:scale-95"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg></a>
          </div>

          <!-- Right: Location -->
          <button (click)="mapService.recenterOnUser()" class="pointer-events-auto w-12 h-12 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 mb-20 mr-2">
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
             <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             <p class="mt-4 text-blue-500 font-mono text-sm animate-pulse">INITIALIZING SATELLITE LINK...</p>
           </div>
        </div>
      }

      <!-- FEATURE: SOS BUTTON -->
      <app-panic-button></app-panic-button>
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
  // ... dependencies ...
  mapService = inject(MapService);
  authService = inject(AuthService);
  router = inject(Router);
  toastCtrl = inject(ToastController);

  isMenuOpen = signal(false);

  constructor() {
    addIcons({ warningOutline }); // Register Icon

    afterNextRender(() => {
      // Safe to access DOM here
      this.mapService.initMap('zarx-map');
    });

    // Effect to show errors
    effect(() => {
       const err = this.mapService.errorMessage();
       if (err) {
         this.showToast(err);
         // Clear error after showing to allow new ones
         this.mapService.errorMessage.set(null); 
       }
    });
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      position: 'top',
      color: 'warning',
      icon: 'warning-outline'
    });
    await toast.present();
  }

  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }

  openProfile() {
    this.router.navigate(['/profile']);
  }

  openSettings() {
    this.router.navigate(['/profile']); 
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/inicio']);
  }

  ngOnDestroy(): void {
    this.mapService.cleanup();
  }
}
