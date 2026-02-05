import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IdentityService } from '../../../../core/services/identity.service';
import { ReputationService } from '../../../../core/services/reputation.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-zarx-id',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto">
      
      <!-- HOLOGRAPHIC CARD CONTAINER -->
      <div class="relative w-full aspect-3/4 rounded-3xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl group">
        
        <!-- Background Effects -->
        <div class="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 opacity-90"></div>
        <div class="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-(--rank-color) to-transparent opacity-50 animate-scan"></div>
        
        <!-- Grid Pattern -->
        <div class="absolute inset-0 opacity-10" 
             style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px;">
        </div>

        <!-- CONTENT -->
        <div class="relative z-10 flex flex-col items-center h-full p-6 text-center">
          
          <!-- Header -->
          <div class="w-full flex justify-between items-center mb-6">
             <div class="flex items-center gap-2">
               <img src="/assets/icons/icon-72x72.png" class="w-8 h-8 opacity-80" alt="ZARX Logo">
               <span class="font-black text-white tracking-widest text-xs uppercase opacity-70">ZARX ID SYSTEM</span>
             </div>
             <div class="px-2 py-0.5 rounded border border-(--rank-color) text-(--rank-color) text-[10px] font-bold">
               VERIFIED
             </div>
          </div>

          <!-- Avatar & Rank -->
          <div class="relative mb-6">
             <div class="w-24 h-24 rounded-full border-2 border-(--rank-color) p-1 relative">
                <img [src]="userAvatar() || 'assets/images/placeholder_avatar.png'" class="w-full h-full rounded-full object-cover bg-slate-800">
                
                <!-- Rank Icon Badge -->
                <div class="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xl shadow-lg">
                   {{ reputationService.rank().icon }}
                </div>
             </div>
          </div>

          <!-- User Info -->
          <h2 class="text-2xl font-black text-white uppercase tracking-tight mb-1">
            {{ userName() || 'Ciudadano' }}
          </h2>
          <div class="text-(--rank-color) font-bold text-sm mb-6 flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
             {{ reputationService.rank().label }} • {{ reputationService.currentScore() }} PTS
          </div>

          <!-- QR CODE ZONE -->
          <div class="relative w-56 h-56 bg-white p-2 rounded-xl shadow-inner mb-4 flex items-center justify-center overflow-hidden">
             
             <!-- Loading State -->
             <div *ngIf="identityService.isGenerating()" class="absolute inset-0 flex items-center justify-center bg-slate-100 z-20">
                <div class="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
             </div>

             <!-- QR Image -->
             <img *ngIf="identityService.qrDataUrl()" [src]="identityService.qrDataUrl()" class="w-full h-full object-contain mix-blend-multiply transition-opacity duration-300">
             
             <!-- Scan Line Animation -->
             <div class="absolute inset-0 bg-linear-to-b from-transparent via-(--rank-color) to-transparent h-[10%] w-full opacity-20 animate-scan-line pointer-events-none"></div>
          </div>

          <!-- Timer & Hash -->
          <div class="w-full flex flex-col items-center mt-auto">
             <div class="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
               <div class="h-full bg-(--rank-color) transition-all duration-1000 ease-linear"
                    [style.width.%]="(identityService.timeLeft() / 60) * 100">
               </div>
             </div>
             <p class="text-[10px] text-slate-500 font-mono tracking-widest">
               REFRESH IN {{ identityService.timeLeft() }}s
             </p>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      --rank-color: #3b82f6; /* Default Blue */
    }
    .animate-scan {
      animation: scan 3s linear infinite;
    }
    @keyframes scan {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-scan-line {
      animation: scanLine 2s ease-in-out infinite;
    }
    @keyframes scanLine {
      0%, 100% { top: 0%; opacity: 0; }
      50% { opacity: 0.5; }
      100% { top: 100%; opacity: 0; }
    }
  `]
})
export class ZarxIdComponent implements OnInit, OnDestroy {
  identityService = inject(IdentityService);
  reputationService = inject(ReputationService);
  private authService = inject(AuthService);

  userAvatar = signal<string | null>(null);
  userName = signal<string | null>(null);

  constructor() {
    // Update CSS Variable for Rank Color
    effect(() => {
       const info = this.reputationService.rank();
       const hex = this.getHexColor(info.rank);
       
       const host = document.querySelector('app-zarx-id') as HTMLElement;
       if (host) {
         host.style.setProperty('--rank-color', hex);
       }
    });

    // Load user data
    const user = this.authService.currentUser();
    if (user?.user_metadata) {
       this.userAvatar.set(user.user_metadata['avatar_url']);
       this.userName.set(user.user_metadata['full_name']);
    }
  }

  ngOnInit() {
    this.identityService.generateIdentityQr();
  }

  ngOnDestroy() {
    this.identityService.stopGenerator();
  }

  private getHexColor(rank: string): string {
    switch (rank) {
      case 'VIGILANTE': return '#22c55e'; // Green-500
      case 'CIUDADANO_MODELO': return '#3b82f6'; // Blue-500
      case 'OBSERVADO': return '#f59e0b'; // Amber-500
      case 'SOSPECHOSO': return '#ef4444'; // Red-500
      default: return '#ffffff';
    }
  }
}
