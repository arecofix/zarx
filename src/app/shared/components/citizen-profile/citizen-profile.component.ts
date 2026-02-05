import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReputationService } from '../../../core/services/reputation.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { ZarxIdComponent } from '../../../features/profile/components/zarx-id/zarx-id.component';
import { ScannerComponent } from '../../../features/admin/components/scanner/scanner.component';

@Component({
  selector: 'app-citizen-profile',
  standalone: true,
  imports: [CommonModule, ZarxIdComponent, ScannerComponent],
  template: `
    <div class="bg-slate-900 rounded-2xl border border-slate-700 p-6">
      <!-- SCANNER OVERLAY -->
      @if (showScanner()) {
         <app-scanner class="fixed inset-0 z-100" (exit)="showScanner.set(false)"></app-scanner>
      }

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Perfil Ciudadano</h2>
        <button
          (click)="refresh()"
          class="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          [class.animate-spin]="isLoading()"
        >
          <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>

      @if (isLoading()) {
        <div class="text-center py-12">
          <div class="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else {
        <!-- Score Display -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-32 h-32 rounded-full mb-4"
               [style.background]="'linear-gradient(135deg, ' + rankInfo().color + '20, ' + rankInfo().color + '40)'">
            <div class="text-6xl">{{ rankInfo().icon }}</div>
          </div>

          <div class="text-5xl font-bold mb-2"
               [style.color]="rankInfo().color">
            {{ score() }}
          </div>

          <div class="text-lg font-bold mb-1"
               [style.color]="rankInfo().color">
            {{ rankInfo().label }}
          </div>

          <div class="text-sm text-slate-400">
            Score Ciudadano
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mb-8">
          <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{{ rankInfo().minScore }}</span>
            <span>Progreso al siguiente rango</span>
            <span>{{ rankInfo().maxScore }}</span>
          </div>
          <div class="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              class="h-full transition-all duration-500 rounded-full"
              [style.width.%]="progress()"
              [style.background]="'linear-gradient(90deg, ' + rankInfo().color + ', ' + rankInfo().color + 'CC)'"
            ></div>
          </div>
          <div class="text-center text-sm font-bold mt-2"
               [style.color]="rankInfo().color">
            {{ progress() }}%
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-slate-800 rounded-lg p-4">
            <div class="text-2xl font-bold text-white mb-1">{{ referralCount() }}</div>
            <div class="text-xs text-slate-400">Referidos</div>
          </div>

          <div class="bg-slate-800 rounded-lg p-4">
            <div class="text-2xl font-bold mb-1"
                 [class.text-emerald-400]="sentinelUnlocked()"
                 [class.text-slate-500]="!sentinelUnlocked()">
              {{ sentinelUnlocked() ? '✓' : '🔒' }}
            </div>
            <div class="text-xs text-slate-400">Modo Centinela</div>
          </div>
        </div>

        <!-- ZARX ID Button -->
        <button 
           (click)="showIdModal.set(true)"
           class="w-full py-4 mb-8 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-500 rounded-xl transition-all group relative overflow-hidden flex items-center justify-center gap-3"
        >
           <div class="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
           <div class="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-600 group-hover:border-(--rank-color) transition-colors">
              <span class="text-xl">🆔</span>
           </div>
           <div class="text-left">
              <div class="font-black text-white uppercase tracking-widest text-sm">Pasaporte Digital</div>
              <div class="text-[10px] text-slate-400 font-mono">VERIFICACIÓN SOBERANA</div>
           </div>
        </button>

        <!-- ZARX ID MODAL -->
        @if (showIdModal()) {
           <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" (click)="showIdModal.set(false)">
              <div class="relative animate-scale-up" (click)="$event.stopPropagation()">
                 <button (click)="showIdModal.set(false)" class="absolute -top-12 right-0 text-white p-2 bg-slate-800 rounded-full hover:bg-slate-700">
                    ✕
                 </button>
                 <app-zarx-id></app-zarx-id>
              </div>
           </div>
        }

        <!-- Sentinel Unlock Progress -->
        @if (!sentinelUnlocked()) {
          <div class="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-6">
            <div class="flex items-start gap-3">
              <span class="text-2xl">🔓</span>
              <div class="flex-1">
                <div class="font-bold text-amber-400 mb-1">Desbloquea Modo Centinela</div>
                <div class="text-sm text-amber-200/80 mb-3">
                  Invita a 3 vecinos para acceder a funciones IoT avanzadas
                </div>
                <div class="flex items-center gap-2">
                  @for (i of [1,2,3]; track i) {
                    <div class="flex-1 h-2 rounded-full"
                         [class.bg-emerald-500]="i <= referralCount()"
                         [class.bg-slate-700]="i > referralCount()">
                    </div>
                  }
                </div>
                <div class="text-xs text-amber-300 mt-2">
                  {{ referralCount() }}/3 completados
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Referral Code -->
        <div class="bg-slate-800 rounded-lg p-4 mb-6">
          <div class="text-xs text-slate-400 mb-2">Tu Código de Referido</div>
          <div class="flex items-center gap-2">
            <div class="flex-1 font-mono text-lg font-bold text-emerald-400 bg-slate-900 rounded px-3 py-2">
              {{ referralCode() || 'Cargando...' }}
            </div>
            <button
              (click)="copyReferralLink()"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold transition-all active:scale-95"
            >
              📋 Copiar Link
            </button>
          </div>
        </div>

        <!-- Recent History -->
        @if (history().length > 0) {
          <div>
            <h3 class="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3">
              Historial Reciente
            </h3>
            <div class="space-y-2">
              @for (entry of history().slice(0, 5); track entry.id) {
                <div class="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                  <div class="flex-1">
                    <div class="text-sm text-white">{{ entry.reason }}</div>
                    <div class="text-xs text-slate-400">
                      {{ formatDate(entry.created_at) }}
                    </div>
                  </div>
                  <div class="font-bold text-lg"
                       [class.text-emerald-400]="entry.points_change > 0"
                       [class.text-red-400]="entry.points_change < 0">
                    {{ entry.points_change > 0 ? '+' : '' }}{{ entry.points_change }}
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: []
})
export class CitizenProfileComponent implements OnInit {
  private reputationService = inject(ReputationService);
  private supabase = inject(SupabaseService).client;
  private toastService = inject(ToastService);

  // Signals
  score = this.reputationService.currentScore;
  history = this.reputationService.history;
  isLoading = this.reputationService.isLoading;
  rankInfo = this.reputationService.rank;
  progress = this.reputationService.progressToNextRank;
  
  showIdModal = signal(false); // Modal visibility controls
  showScanner = signal(false); // Scanner visibility controls

  referralCode = signal<string>('');
  referralCount = signal<number>(0);
  sentinelUnlocked = signal<boolean>(false);

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    await this.reputationService.loadCurrentScore();
    await this.reputationService.loadHistory();
    await this.loadReferralInfo();
  }

  async loadReferralInfo() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await this.supabase
        .from('profiles')
        .select('referral_code, referral_count, sentinel_mode_unlocked')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      this.referralCode.set(data?.referral_code || '');
      this.referralCount.set(data?.referral_count || 0);
      this.sentinelUnlocked.set(data?.sentinel_mode_unlocked || false);

    } catch (error) {
      console.error('Error loading referral info:', error);
    }
  }

  async refresh() {
    await this.loadProfile();
    this.toastService.success('Perfil actualizado');
  }

  async copyReferralLink() {
    const link = await this.reputationService.generateReferralLink();
    
    try {
      await navigator.clipboard.writeText(link);
      this.toastService.success('Link copiado al portapapeles');
    } catch (error) {
      console.error('Error copying link:', error);
      this.toastService.error('Error al copiar link');
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    
    return date.toLocaleDateString('es-AR');
  }
}
