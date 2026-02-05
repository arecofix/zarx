import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReferralService } from '../../../core/services/referral.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-invite-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-linear-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-xl overflow-hidden p-6 relative">
       <!-- Background Decors -->
       <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl pointer-events-none"></div>

       <div class="flex flex-col gap-6">
          <!-- Stats Row -->
          <div class="flex items-center justify-between">
             <div>
                <div class="text-3xl font-black text-white">{{ stats().count }}</div>
                <div class="text-xs text-emerald-400 font-bold uppercase tracking-wider">Vecinos Protegidos</div>
             </div>
             <!-- Rank Badge -->
             @if (stats().count >= 10) {
                <div class="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-400 text-xs font-bold flex items-center gap-1">
                   <span>🏆</span> LÍDER VECINAL
                </div>
             }
          </div>

          <!-- Invite Code & Action -->
          <div class="bg-black/30 rounded-lg p-4 border border-white/5 backdrop-blur-sm">
             <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <p class="text-xs text-slate-400">TU CÓDIGO DE INVITACIÓN</p>
                <div class="text-[10px] text-emerald-500/80 font-mono">
                    {{ inviteUrl() }}
                </div>
             </div>
             
             <div class="flex items-center gap-3">
                <div class="flex-1 font-mono text-xl font-bold text-white tracking-widest bg-slate-800/50 p-2 rounded text-center select-all">
                   {{ auth.profile()?.invite_code || '...' }}
                </div>
                <button 
                  (click)="shareInvite()" 
                  class="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                   <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                   </svg>
                   <span>COMPARTIR</span>
                </button>
             </div>
          </div>
          
          <div class="flex items-start gap-2">
             <div class="mt-1 p-1 bg-emerald-500/20 rounded-full">
                <svg class="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
             </div>
             <p class="text-[11px] text-slate-400 leading-relaxed">
                <strong class="text-white">Ganá +100 puntos</strong> por cada vecino que se registre y complete su validación. Tu vecino recibe <strong class="text-white">+50 puntos</strong> de bienvenida.
             </p>
          </div>
       </div>
    </div>
  `
})
export class InviteCardComponent implements OnInit {
  auth = inject(AuthService);
  private referralService = inject(ReferralService);

  stats = signal({ count: 0 });
  
  inviteUrl = computed(() => {
     const code = this.auth.profile()?.invite_code;
     return code ? this.referralService.getInviteLink(code) : '';
  });

  async ngOnInit() {
     const { count } = await this.referralService.getReferralStats();
     this.stats.set({ count });
  }

  shareInvite() {
     const code = this.auth.profile()?.invite_code;
     if (code) {
        this.referralService.shareInvite(code);
     }
  }
}
