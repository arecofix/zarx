import { Component, OnInit, signal, Inject, PLATFORM_ID, inject, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common'; 
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MapComponent } from './components/map/map.component';
import { NewsTickerComponent } from './components/news-ticker/news-ticker.component';
import { BottomSheetComponent } from './components/bottom-sheet/bottom-sheet.component';
import { OnboardingOverlayComponent } from './components/onboarding-overlay/onboarding-overlay.component';
import { ReportsMenuComponent } from './components/reports-menu/reports-menu.component';
import { ToastNotificationComponent } from '../../shared/components/toast-notification/toast-notification.component';
import { NewsItem } from './models/home.models';
import { AppConstants } from '../../core/constants/app.constants';
import { AlertService } from '../../core/services/alert.service';
import { LocationService } from '../../core/services/location.service';
import { ToastService } from '../../core/services/toast.service';
import { ReportType } from '../../core/models';
import { REPORT_STRATEGIES } from '../../core/config/report.config';
import { CameraService } from '../../core/services/camera.service';
import { ReportService } from '../../core/services/report.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { PwaService } from '../../core/services/pwa.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    MapComponent, 
    NewsTickerComponent, 
    BottomSheetComponent, 
    OnboardingOverlayComponent,
    ReportsMenuComponent,
    ReportsMenuComponent,
    ToastNotificationComponent,
    FormsModule
  ],
  template: `
    <div class="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      
      <!-- TOAST NOTIFICATIONS (Global for this screen) -->
      <app-toast-notification></app-toast-notification>

      <!-- ONBOARDING OVERLAY (Z-50) -->
      @if (showOnboarding()) {
        <app-onboarding-overlay (complete)="onOnboardingComplete()"></app-onboarding-overlay>
      }

      <!-- LAYER 1: HUD TICKER (Z-10) -->
      @if (!showOnboarding()) {
         <app-news-ticker [news]="newsItems" (newsClicked)="onNewsClick($event)"></app-news-ticker>
      }

      <!-- LAYER 2: CONTROLS (Z-20) -->
      @if (!showOnboarding()) {

        <!-- PWA INSTALL BUTTON (Top Center/Left) -->
        @if (pwaService.isInstallable()) {
           <div class="fixed top-16 left-4 z-50 animate-bounce">
              <button 
                (click)="pwaService.installApp()"
                class="bg-blue-600/90 backdrop-blur hover:bg-blue-500 text-white font-black text-xs py-3 px-5 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)] flex items-center gap-2 border border-blue-400/50 uppercase tracking-widest transition-all active:scale-95"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Instalar App</span>
              </button>
           </div>
        }
        
        <!-- Profile Badge & Menu (Top Right) -->
        <div class="fixed top-14 right-4 z-40 flex flex-col items-end">
          
          <div 
             (click)="toggleProfileMenu()"
             class="flex items-center gap-3 bg-slate-900/90 backdrop-blur rounded-full pl-4 pr-1 py-1 border border-white/10 shadow-lg animate-slide-in-right cursor-pointer hover:bg-slate-800 transition-colors select-none"
          >
             <div class="text-right">
               <div class="text-[10px] font-mono text-emerald-400 font-bold">{{ UI.HOME.SCORE }}: {{ userScore() }}</div>
               <div class="text-[9px] text-slate-400 uppercase tracking-widest">{{ userRole() }}</div>
             </div>
             <div class="w-10 h-10 rounded-full bg-slate-800 border-2 border-emerald-500 overflow-hidden relative">
               <img [src]="userAvatar()" alt="User" class="w-full h-full object-cover opacity-80" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAyNCAyNCcgZmlsbD0ibm9uZScgc3Ryb2tlPSdjdXJyZW50Q29sb3InIHN0cm9rZS13aWR0aD0nMicgc3Ryb2tlLWxpbmVjYXA9J3JvdW5kJyBzdHJva2UtbGluZWpvaW49J3JvdW5kJyBjbGFzcz0idGV4dC1zbGF0ZS01MDAiPjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCIgLz48cGF0aCBkPSJNMjAgMjF2LTIwLTYiIC8+PC9zdmc+'" />
             </div>
          </div>

          <!-- Dropdown Menu -->
          @if (showProfileMenu()) {
            <div class="mt-2 w-48 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-sm shadow-xl overflow-hidden animate-fade-in-down">
               <button (click)="navigateTo('/profile')" class="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white border-b border-slate-800 flex items-center gap-2">
                 <span>👤</span> {{ UI.PROFILE.TITLE }}
               </button>
               <button (click)="navigateTo('/settings')" class="w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white border-b border-slate-800 flex items-center gap-2">
                 <span>⚙️</span> {{ UI.PROFILE.SETTINGS }}
               </button>
               <button (click)="logout()" class="w-full text-left px-4 py-3 text-xs text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center gap-2">
                 <span>🚪</span> {{ UI.PROFILE.LOGOUT }}
               </button>
            </div>
          }
        </div>

        <!-- FAB CONTROLS (Map Tools) -->
        <div class="fixed right-4 top-36 z-40 flex flex-col gap-3 animate-slide-in-right">
            
            <!-- Recenter -->
            <button (click)="recenterMap()" class="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-600 text-slate-300 flex items-center justify-center shadow-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all active:scale-95" title="Recentrar Mapa">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
            </button>

            <!-- Virtual Escort / Share -->
            <button (click)="shareLocation()" class="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-600 text-slate-300 flex items-center justify-center shadow-lg hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all active:scale-95" title="Escolta Virtual (Compartir)">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>

        </div>
        
        <!-- REPORT FAB (Left Side ) -->
         <div class="fixed left-4 bottom-32 z-20 animate-slide-in-left">
           <button 
             (click)="showReportMenu.set(true)" 
             class="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 hover:border-emerald-500 hover:scale-105 transition-all group"
             title="Reportar Incidente"
           >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:rotate-90 transition-transform"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
           </button>
           <span class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 bg-black/50 px-2 rounded-full whitespace-nowrap">REPORTAR</span>
         </div>

        <!-- Quick Access Emergency Buttons (Right Sidebar) -->
        <div class="fixed right-4 bottom-32 z-20 flex flex-col gap-3 items-center animate-slide-in-right">
           
           <!-- Police -->
           <button (click)="callEmergency('POLICE')" class="w-12 h-12 rounded-full bg-blue-900/80 border border-blue-500 text-blue-400 flex items-center justify-center shadow-lg hover:bg-blue-600 hover:text-white hover:scale-110 transition-all" [title]="EMERGENCY.POLICE.label + ' (' + EMERGENCY.POLICE.number + ')'">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 1 0-9-9c0 1.488.36 2.891 1 4.127L3 21l4.873-1c1.236.64 2.64 1 4.127 1Z"/><path d="M12 11V7"/><path d="M12 17h.01"/></svg> 
           </button>

           <!-- Firefighters -->
           <button (click)="callEmergency('FIRE')" class="w-12 h-12 rounded-full bg-orange-900/80 border border-orange-500 text-orange-400 flex items-center justify-center shadow-lg hover:bg-orange-600 hover:text-white hover:scale-110 transition-all" [title]="EMERGENCY.FIRE.label + ' (' + EMERGENCY.FIRE.number + ')'">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.5-3.3.3-1.4.8-2.6 1.5-3.6Z"/></svg>
           </button>

           <!-- Ambulance -->
           <button (click)="callEmergency('MEDICAL')" class="w-12 h-12 rounded-full bg-emerald-900/80 border border-emerald-500 text-emerald-400 flex items-center justify-center shadow-lg hover:bg-emerald-600 hover:text-white hover:scale-110 transition-all" [title]="EMERGENCY.MEDICAL.label + ' (' + EMERGENCY.MEDICAL.number + ')'">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>
           </button>

        </div>

        <!-- SOS Button (Bottom Center) -->
        <button 
           (click)="onSosClick()"
           (pointerdown)="startSosPress()" 
           (pointerup)="endSosPress()" 
           (pointerleave)="endSosPress()"
           class="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 w-24 h-24 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-[0_0_30px_rgba(0,0,0,0.5)] group active:scale-95 overflow-hidden transition-all"
           [class.bg-emerald-600]="!isSosPressed()"
           [class.bg-red-600]="isSosPressed()"
        >
           <!-- Radial Progress Background -->
           <div class="absolute inset-0 bg-red-600 origin-bottom transform transition-transform duration-1000 ease-linear"
                [class.scale-y-0]="!isSosPressed()"
                [class.scale-y-100]="isSosPressed()">
           </div>

           <span class="relative z-10 font-black text-white text-xl tracking-tighter group-hover:animate-pulse">
             {{ isSosPressed() ? 'HOLD...' : UI.HOME.SOS_LABEL }}
           </span>
           
           <!-- Ring progress visual -->
           <svg class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-1">
             <circle cx="50%" cy="50%" r="42" fill="none" stroke="currentColor" stroke-width="4" class="text-white/20" />
             <circle cx="50%" cy="50%" r="42" fill="none" stroke="white" stroke-width="4" 
                     class="opacity-0 transition-opacity duration-300"
                     [class.opacity-100]="isSosPressed()"
                     [style.stroke-dasharray]="264"
                     [style.stroke-dashoffset]="isSosPressed() ? 0 : 264"
                     class="transition-all duration-1000 ease-linear" />
           </svg>
        </button>

      }

      <!-- LAYER 3: BOTTOM SHEET (Z-30) -->
      @if (!showOnboarding()) {
         <app-bottom-sheet class="z-30"></app-bottom-sheet>
      }
      
      @if (showReportMenu()) {
        <app-reports-menu 
           [isLoading]="alertService.isSending()"
           (selectReport)="onReportSelected($event)" 
           (closeMenu)="showReportMenu.set(false)">
        </app-reports-menu>
      }

      <!-- REPORT WIZARD OVERLAY (Z-50) -->
      @if (selectedReportType()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur p-6 animate-fade-in">
           <div class="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative animate-slide-up">
              
              <h3 class="text-xl text-white font-bold mb-4 flex items-center gap-2">
                <span>📝</span> Detalles del Reporte
              </h3>

              <!-- Description -->
              <div class="mb-4">
                <label class="text-slate-400 text-xs uppercase tracking-wider font-bold">Descripción (Opcional)</label>
                <textarea 
                  [ngModel]="reportDescription()"
                  (ngModelChange)="reportDescription.set($event)"
                  class="w-full mt-2 bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 outline-none resize-none h-24 text-sm"
                  placeholder="Ej: Auto gris mal estacionado..."
                ></textarea>
              </div>

              <!-- Evidence Preview -->
              @if (reportEvidencePreview()) {
                 <div class="mb-4 relative rounded-lg overflow-hidden border border-slate-600 aspect-video group bg-black">
                    <img [src]="reportEvidencePreview()" class="w-full h-full object-contain" />
                    <button (click)="clearEvidence()" class="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg hover:bg-red-500">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                 </div>
              }

              <!-- Buttons Grid -->
              <div class="grid grid-cols-2 gap-3 mb-2">
                 <!-- Camera Button -->
                 <button (click)="captureEvidence()" class="p-3 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-emerald-500 hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span class="text-xs font-bold">
                      FOTO {{ isPhotoRequired() ? '(Obligatoria)' : '(Opcional)' }}
                    </span>
                 </button>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-3 mt-6">
                 <button (click)="cancelReport()" class="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors">
                    Cancelar
                 </button>
                 <button 
                    (click)="confirmReport()" 
                    [disabled]="reportService.isUploading() || (isPhotoRequired() && !reportEvidenceBlob())" 
                    class="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                 >
                    @if (reportService.isUploading()) {
                       <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    }
                    {{ reportService.isUploading() ? 'Enviando...' : 'Enviar Reporte' }}
                 </button>
              </div>

           </div>
        </div>
      }

      <!-- LAYER 0: MAP (Z-0) -->
      @if (!showOnboarding()) {
         <app-map #mapComponent class="absolute inset-0 z-0"></app-map>
      }

    </div>
  `,
  styles: [`
    .animate-slide-in-right { animation: slideInRight 0.5s ease-out; }
    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-slide-in-left { animation: slideInLeft 0.5s ease-out; }
    @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-fade-in-down { animation: fadeInDown 0.2s ease-out; }
    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  `]
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  public alertService = inject(AlertService); 
  public reportService = inject(ReportService);
  private cameraService = inject(CameraService);
  private locationService = inject(LocationService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  public pwaService = inject(PwaService); // Public for template access

  @ViewChild('mapComponent') mapComponent!: MapComponent;

  UI = AppConstants.UI;
  EMERGENCY = AppConstants.EMERGENCY;

  showOnboarding = signal(true);
  showProfileMenu = signal(false);
  showReportMenu = signal(false);
  
  // Report Wizard Signals
  selectedReportType = signal<ReportType | null>(null);
  reportDescription = signal('');
  reportEvidenceBlob = signal<Blob | null>(null);
  reportEvidencePreview = signal<SafeUrl | null>(null);
  
  // Computed or Helper
  isPhotoRequired() {
     const type = this.selectedReportType();
     if (!type) return false;
     return REPORT_STRATEGIES[type]?.requiresPhoto ?? false;
  }
  
  // Dummy Data
  userScore = signal(850);
  userRole = signal('CIUDADANO');
  userAvatar = signal(AppConstants.ASSETS.IMAGES.AVATAR_PLACEHOLDER);

  newsItems: NewsItem[] = [
    { id: '1', text: 'ALERTA: Incendio en Barrio La Paz', type: 'urgent', timestamp: new Date() },
    { id: '2', text: 'CONCEJAL ZARX: Nuevas cámaras instaladas en Zona Sur', type: 'info', timestamp: new Date() },
    { id: '3', text: 'TRÁFICO: Accidente en Ruta 40, km 50', type: 'urgent', timestamp: new Date() }
  ];

  // SOS Logic (Hold to Panic)
  isSosPressed = signal(false);
  private sosTimeout: any;
  private longPressTriggered = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const hasSeen = localStorage.getItem('hasSeenOnboarding');
      if (hasSeen === 'true') {
        this.showOnboarding.set(false);
      }
      
      const profile = this.authService.profile();
      if (profile) {
        // Here we could update user data
      }
      
      // Start Location Tracking silently
      this.locationService.startTracking();
    }
  }

  onOnboardingComplete() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
    this.showOnboarding.set(false);
  }

  onNewsClick(item: NewsItem) {
    console.log('News clicked:', item);
  }

  toggleProfileMenu() {
    this.showProfileMenu.update(v => !v);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
    this.showProfileMenu.set(false);
  }

  callEmergency(type: keyof typeof AppConstants.EMERGENCY) {
    const config = this.EMERGENCY[type];
    
    if (config) {
      if (isPlatformBrowser(this.platformId)) {
          window.open(`tel:${config.number}`, '_self');
      }
    }
  }

  logout() {
    this.authService.signOut();
    this.showProfileMenu.set(false);
  }

  // --- MAP CONTROLS ---

  async recenterMap() {
    const pos = await this.locationService.getCurrentPosition();
    if (pos && this.mapComponent) {
      this.mapComponent.flyTo(pos.coords.latitude, pos.coords.longitude);
      this.toastService.info("📍 Ubicación actualizada", 1500);
    } else {
      this.toastService.error("No se pudo obtener ubicación. Revise GPS.");
    }
  }

  shareLocation() {
    if (isPlatformBrowser(this.platformId)) {
       const pos = this.locationService.currentPosition();
       if (!pos) {
         this.toastService.error("Esperando señal GPS...");
         this.locationService.getCurrentPosition(); // Try to force it
         return;
       }

       const { latitude, longitude } = pos.coords;
       const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
       
       if (navigator.share) {
         navigator.share({
           title: 'Escolta Virtual ZARX',
           text: 'Estoy compartiendo mi ubicación en tiempo real por seguridad.',
           url: url
         }).catch(err => console.log('Share canceled', err));
       } else {
         // Fallback copy to clipboard
         navigator.clipboard.writeText(url).then(() => {
           this.toastService.success("Enlace copiado al portapapeles");
         });
       }
    }
  }

  // --- SOS Logic ---

  onSosClick() {
    // If long press was triggered, ignore the click (mouseup usually triggers click too)
    if (this.longPressTriggered) {
      this.longPressTriggered = false;
      return;
    }
    this.showReportMenu.set(true);
  }

  startSosPress() {
    if (this.showReportMenu()) return; // Don't press underneath menu
    this.isSosPressed.set(true);
    this.longPressTriggered = false;
    
    this.sosTimeout = setTimeout(() => {
      this.longPressTriggered = true; // Mark as handled by long press
      this.triggerPanicDirect(); // Direct Panic
    }, 1500); // 1.5s hold for panic
  }

  endSosPress() {
    if (this.isSosPressed()) {
      this.isSosPressed.set(false);
      clearTimeout(this.sosTimeout);
    }
  }

  async triggerPanicDirect() {
    // Direct panic from hold
    console.log('🚨 DIRECT PANIC TRIGGERED 🚨');
    this.toastService.warning("ACTIVANDO PÁNICO...", 1000);
    await this.alertService.sendAlert(ReportType.PANIC, "Pánico activado por botón SOS (Hold)");
  }

  async onReportSelected(type: ReportType) {
    if (type === ReportType.PANIC || type === ReportType.SOS) {
       // Panic is immediate, no wizard
       const result = await this.alertService.sendAlert(type);
       if (result) this.showReportMenu.set(false);
    } else {
       // Open Wizard for other types
       this.showReportMenu.set(false);
       this.selectedReportType.set(type);
       this.reportDescription.set('');
       this.clearEvidence();
    }
  }

  async captureEvidence() {
    const blob = await this.cameraService.takePhoto();
    if (blob) {
      this.reportEvidenceBlob.set(blob);
      const url = URL.createObjectURL(blob);
      this.reportEvidencePreview.set(this.sanitizer.bypassSecurityTrustUrl(url));
    }
  }

  clearEvidence() {
    this.reportEvidenceBlob.set(null);
    this.reportEvidencePreview.set(null);
  }

  cancelReport() {
    this.selectedReportType.set(null);
    this.clearEvidence();
  }

  async confirmReport() {
    const type = this.selectedReportType();
    if (!type) return;

    const desc = this.reportDescription();
    const evidence = this.reportEvidenceBlob();

    const success = await this.reportService.createReport(type, desc, evidence);
    
    if (success) {
      this.selectedReportType.set(null);
      this.clearEvidence();
      // Toast handles inside service? AlertService does, ReportService calls it.
    }
  }
}
