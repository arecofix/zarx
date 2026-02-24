import { Component, OnInit, signal, Inject, PLATFORM_ID, inject, ViewChild, Injector, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common'; 
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MapComponent } from './components/map/map.component';
import { CriticalAlertBarComponent } from './components/critical-alert-bar/critical-alert-bar.component';
import { NetworkNewsSheetComponent } from './components/network-news-sheet/network-news-sheet.component';
import { CommunityCarouselComponent, CommunityItem } from './components/community-carousel/community-carousel.component';
import { OnboardingOverlayComponent } from './components/onboarding-overlay/onboarding-overlay.component';
import { OnboardingComponent } from '../auth/components/onboarding/onboarding.component';
import { ReportsMenuComponent } from './components/reports-menu/reports-menu.component';
import { ToastNotificationComponent } from '../../shared/components/toast-notification/toast-notification.component';
import { AppConstants } from '../../core/constants/app.constants';
import { LocationService } from '../../core/services/location.service';
import { ToastService } from '../../core/services/toast.service';
import { ReportType, Report } from '../../core/models';
import { ReportService } from '../../core/services/report.service';
import { PwaService } from '../../core/services/pwa.service';
import { NotificationService } from '../../core/services/notification.service';
import { PanicButtonComponent } from '../../shared/components/panic-button/panic-button.component';
import { ReportWizardComponent } from './components/report-wizard/report-wizard.component';
import { Logger } from '../../core/utils/logger';
import { HomeUseCase } from './application/home.usecase';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    MapComponent, 
    CriticalAlertBarComponent,
    NetworkNewsSheetComponent,
    CommunityCarouselComponent,
    OnboardingOverlayComponent,
    ReportsMenuComponent,
    ToastNotificationComponent,
    PanicButtonComponent,
    OnboardingComponent,
    ReportWizardComponent
  ],
  template: `
    <div class="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none flex flex-col">
      
      <!-- TOAST NOTIFICATIONS (Global for this screen) -->
      <app-toast-notification></app-toast-notification>

      <!-- ONBOARDING OVERLAY (Z-50) -->
      @if (showOnboarding()) {
        <app-onboarding-overlay (complete)="onOnboardingComplete()"></app-onboarding-overlay>
      } @else if (showIdentityOnboarding()) {
        <app-onboarding></app-onboarding>
      }

      <!-- LAYER 1: ALERTS & INFO STRUCTURE -->
      @if (!showOnboarding() && !showIdentityOnboarding()) {
          
          <!-- 1.1 CRITICAL ALERTS (TOP MOST) -->
          <div class="fixed top-0 left-0 w-full z-100 pointer-events-auto">
             <app-critical-alert-bar 
                [alerts]="homeUseCase.criticalAlerts()" 
                (alertClicked)="onAlertClick($event)">
             </app-critical-alert-bar>
          </div>


          <!-- 1.2 NETWORK NEWS / CONTEXT (BELOW CRITICAL) -->
          <!-- Dynamic positioning: If critical bar active, move down -->
          <div class="fixed top-0 left-0 right-0 z-90 transition-all duration-300 pointer-events-none" 
               [class.top-14]="homeUseCase.criticalAlerts().length > 0"
               [class.sm:top-12]="homeUseCase.criticalAlerts().length > 0">
              <app-network-news-sheet 
                 [reports]="homeUseCase.networkReports()" 
                 (reportClicked)="onAlertClick($event)">
              </app-network-news-sheet>
          </div>
      }

      <!-- LAYER 2: CONTROLS (Z-20) -->
      @if (!showOnboarding()) {

         <!-- PWA INSTALL BUTTON (Top Center-Left) -->
         @if (pwaService.isInstallable()) {
            <div class="fixed top-24 left-4 z-80 animate-bounce pointer-events-auto transition-all duration-300"
                 [class.mt-14]="homeUseCase.criticalAlerts().length > 0"
                 [class.sm:mt-12]="homeUseCase.criticalAlerts().length > 0">
               <button 
                 (click)="pwaService.installApp()"
                 class="w-10 h-10 rounded-full bg-blue-600/90 flex items-center justify-center text-white shadow-lg border border-blue-400 hover:bg-blue-500 transition-colors"
                 title="Instalar App"
               >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               </button>
            </div>

         }
        
         <!-- TOP RIGHT CONTROL GROUP (Profile, Notifs) -->
         <!-- Moved slightly down to accommodate alerts -->
         <div class="fixed top-4 right-4 z-95 flex flex-col items-end gap-3 pointer-events-none transition-all duration-300"
              [class.mt-14]="homeUseCase.criticalAlerts().length > 0"
              [class.sm:mt-12]="homeUseCase.criticalAlerts().length > 0">

           
           <!-- Combined Interactive Container -->
           <div class="flex items-center gap-2 pointer-events-auto">
             
              <!-- Unified Profile & Notification Pill -->
              <div class="relative flex items-center bg-slate-900/90 backdrop-blur rounded-full p-1 border border-white/10 shadow-lg select-none">
                  
                  <!-- Notification Bell (Inside Pill) -->
                  <div class="relative mr-2">
                     <button (click)="toggleNotifications()" class="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                     </button>
                     @if (notificationService.unreadCount() > 0) {
                       <span class="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white shadow-sm ring-1 ring-slate-900 animate-pulse">
                         {{ notificationService.unreadCount() }}
                       </span>
                     }
                  </div>

                  <!-- Divider -->
                  <div class="w-px h-6 bg-slate-700 mx-1"></div>

                  <!-- Profile Section -->
                  <div (click)="toggleProfileMenu()" class="flex items-center gap-3 pl-2 cursor-pointer hover:bg-slate-800/50 rounded-r-full overflow-hidden p-1 transition-colors">
                      <!-- Just the Avatar/Profile Text -->
                      <div class="text-right hidden sm:block"> 
                        <div class="text-xs font-bold text-white">{{ userName() }}</div>
                        <div class="text-[9px] text-slate-400 font-bold uppercase">{{ userRole() }}</div>
                      </div>

                      <div class="w-8 h-8 rounded-full bg-slate-800 border-2 border-emerald-600 overflow-hidden relative flex items-center justify-center">
                        @if (!imgLoadError()) {
                           <img [src]="userAvatar()" alt="Perfil de Usuario" class="w-full h-full object-cover" (error)="onAvatarError()" />
                        } @else {
                           <!-- Fallback Avatar SVG -->
                           <svg xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-slate-400 bg-slate-800 p-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                           </svg>
                        }
                      </div>
                  </div>

                  <!-- Notifications Dropdown -->
                  @if (showNotifications()) {
                     <div class="absolute top-14 right-0 w-80 max-h-80 overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl animate-fade-in-down origin-top-right flex flex-col z-50">
                        <div class="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/80 sticky top-0 backdrop-blur z-20">
                           <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Notificaciones</h4>
                           @if (notificationService.unreadCount() > 0) {
                             <button (click)="notificationService.markAllAsRead()" class="text-[10px] text-emerald-400 hover:text-emerald-300">Marcar leídas</button>
                           }
                        </div>
                        @for (notif of notificationService.notifications(); track notif.id) {
                           <div 
                              (click)="notificationService.markAsRead(notif.id)"
                              class="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer relative group"
                              [class.bg-slate-800_30]="!notif.is_read"
                           >
                              @if (!notif.is_read) {
                                 <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                              }
                              <div class="flex items-start gap-3">
                                 <div class="mt-1">
                                    @if (notif.type === 'success') { <span class="text-emerald-500">✅</span> }
                                    @else if (notif.type === 'warning') { <span class="text-amber-500">⚠️</span> }
                                    @else if (notif.type === 'error') { <span class="text-red-500">🚫</span> }
                                    @else { <span class="text-blue-500">ℹ️</span> }
                                 </div>
                                 <div class="flex-1">
                                    <h5 class="text-sm font-bold text-slate-200 leading-tight mb-1">{{ notif.title }}</h5>
                                    <p class="text-xs text-slate-300 leading-relaxed font-medium bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                                      "{{ notif.message }}"
                                    </p>
                                    <span class="text-[9px] text-slate-300 mt-2 flex items-center gap-1">
                                      <span>🕒</span> {{ notif.created_at | date:'short' }}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        } @empty {
                           <div class="p-8 text-center text-slate-300 text-xs">
                              Sin notificaciones recientes
                           </div>
                        }
                     </div>
                  }

                  <!-- Profile Menu Dropdown -->
                  @if (showProfileMenu()) {
                    <div class="absolute top-14 right-0 w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down z-50">
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
           </div>
         </div>

         <!-- FAB CONTROLS (Map Tools) -->
         <div class="fixed right-4 top-32 z-30 flex flex-col gap-3 animate-slide-in-right pointer-events-auto"
               [class.mt-12]="homeUseCase.criticalAlerts().length > 0">
            
            <!-- Recenter -->
            <button (click)="recenterMap()" class="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-600 text-slate-300 flex items-center justify-center shadow-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all active:scale-95" title="Recentrar Mapa">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
            </button>

            <!-- Virtual Escort / Share -->
            <button (click)="shareLocation()" class="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-600 text-slate-300 flex items-center justify-center shadow-lg hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all active:scale-95" title="Escolta Virtual (Compartir)">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>

        </div>
        
        <!-- REPORT FAB -->
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

        <!-- Quick Access Emergency Buttons -->
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
      }

      <!-- LAYER 3: COMMUNITY CAROUSEL (BOTTOM FIXED) -->
      @if (!showOnboarding()) {
         <app-community-carousel (itemClick)="onCarouselItemClick($event)"></app-community-carousel>
      }
      
      <!-- REPORT MENUS & DIALOGS -->
      @if (showReportMenu()) {
        <app-reports-menu 
           [isLoading]="reportService.isSending()"
           (selectReport)="onReportSelected($event)" 
           (closeMenu)="showReportMenu.set(false)">
        </app-reports-menu>
      }

      <!-- REPORT WIZARD OVERLAY (Z-50) -->
      @if (selectedReportType()) {
        <app-report-wizard 
           [type]="selectedReportType()!" 
           (close)="selectedReportType.set(null)"
           (success)="onReportSuccess()">
        </app-report-wizard>
      }

      <!-- LAYER 0: MAP (Z-0) -->
      @if (!showOnboarding()) {
         <app-map #mapComponent class="absolute inset-0 z-0"></app-map>
      }

      <!-- PANIC BUTTON (Floating) -->
      @if (!showOnboarding() && !showReportMenu() && !selectedReportType()) {
         <app-panic-button></app-panic-button>
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
  `]
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  public reportService = inject(ReportService);
  private locationService = inject(LocationService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  public pwaService = inject(PwaService);
  public notificationService = inject(NotificationService);
  private injector = inject(Injector);
  public homeUseCase = inject(HomeUseCase);

  @ViewChild('mapComponent') mapComponent!: MapComponent;

  UI = AppConstants.UI;
  EMERGENCY = AppConstants.EMERGENCY;

  showOnboarding = signal(true);
  showProfileMenu = signal(false);
  showNotifications = signal(false);
  showReportMenu = signal(false);
  showIdentityOnboarding = signal(false);
  
  // Report Wizard Signals
  selectedReportType = signal<ReportType | null>(null);
  
  // User Data
  userRole = signal('CIUDADANO');
  userName = signal('Agente');
  userAvatar = signal(AppConstants.ASSETS.IMAGES.AVATAR_PLACEHOLDER);
  imgLoadError = signal(false);
  
  onAvatarError() {
    this.imgLoadError.set(true);
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}
  
  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const hasSeen = localStorage.getItem('hasSeenOnboarding');
      if (hasSeen === 'true') {
        this.showOnboarding.set(false);
      }
      
      // Reactive Profile Updates
      effect(() => {
         const profile = this.authService.profile();
         if (profile) {
            if (!profile.username) this.showIdentityOnboarding.set(true);
            this.userRole.set(profile.role ? profile.role.toUpperCase() : 'CIUDADANO');
            this.userName.set(profile.username || profile.full_name || 'Agente'); 
            if (profile.avatar_url) {
               this.userAvatar.set(profile.avatar_url);
            }
         }
      }, { injector: this.injector });
      
      this.locationService.startTracking();
      this.homeUseCase.loadHomeData(); // Delegated to UseCase
    }
  }

  onOnboardingComplete() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
    this.showOnboarding.set(false);
    
    // Check Identity
    const profile = this.authService.profile();
    if (profile && !profile.username) {
      this.showIdentityOnboarding.set(true);
    }
  }

  onAlertClick(report: Report) {
    Logger.debug('Alert clicked:', report);
    if (report.latitude && report.longitude && this.mapComponent) {
      this.mapComponent.flyTo(report.latitude, report.longitude);
      
      const desc = report.description ? `: ${report.description}` : '';
      this.toastService.info(`${report.type}${desc}`, 4000);
    }
  }

  onCarouselItemClick(item: CommunityItem) {
    this.toastService.info(`ℹ️ ${item.title}: ${item.subtitle}`, 3000);
  }

  toggleProfileMenu() {
    this.showNotifications.set(false); 
    this.showProfileMenu.update(v => !v);
  }

  toggleNotifications() {
     this.showProfileMenu.set(false); 
     this.showNotifications.update(v => !v);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
    this.showProfileMenu.set(false);
  }

  callEmergency(type: keyof typeof AppConstants.EMERGENCY) {
    const config = this.EMERGENCY[type];
    if (config && isPlatformBrowser(this.platformId)) {
       window.open(`tel:${config.number}`, '_self');
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
         this.locationService.getCurrentPosition(); 
         return;
       }

       const { latitude, longitude } = pos.coords;
       const url = `https://www.google.com/maps?q=\${latitude},\${longitude}`;
       
       if (navigator.share) {
         navigator.share({
           title: 'Escolta Virtual ZARX',
           text: 'Estoy compartiendo mi ubicación en tiempo real por seguridad.',
           url: url
         }).catch(err => Logger.debug('Share canceled', err));
       } else {
         navigator.clipboard.writeText(url).then(() => {
           this.toastService.success("Enlace copiado al portapapeles");
         });
       }
    }
  }

  // --- Report Flow ---

  async onReportSelected(type: ReportType) {
    if (type === ReportType.SOS) {
       const result = await this.reportService.createReport(type, "Alerta SOS Manual");
       if (result) this.showReportMenu.set(false);

    } else if (type === ReportType.RIESGO_VIDA) {
       this.showReportMenu.set(false);
       this.toastService.info("⚠️ POR FAVOR, MARCA LA UBICACIÓN EXACTA", 3000);
       
       this.mapComponent.enableSelectionMode();
       
       const sub = this.mapComponent.locationSelected.subscribe(coords => {
         this.selectedReportType.set(type); 
         sub.unsubscribe();
       });

    } else {
       this.showReportMenu.set(false);
       this.selectedReportType.set(type);
    }
  }

  onReportSuccess() {
    this.selectedReportType.set(null);
    this.homeUseCase.loadHomeData(); // Refresh Feeds via UseCase
  }

  openManualLocation() {
    this.mapComponent.enableSelectionMode();
  }
}
