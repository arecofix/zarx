import { Component, Inject, inject, OnInit, PLATFORM_ID, signal, computed, Injector, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { GamificationService, RankProgress } from '../../../../core/services/gamification.service';
import { CameraService } from '../../../../core/services/camera.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Logger } from '../../../../core/utils/logger';
import { FormsModule } from '@angular/forms';
import { Profile } from '../../../../core/models';
import { AppConstants } from '../../../../core/constants/app.constants';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-200 pb-20 font-mono overflow-y-auto">
      
      <!-- NAV HEADER -->
      <header class="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800 p-4 flex items-center justify-between">
         <button (click)="goHome()" class="text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            VOLVER
         </button>
         <h1 class="text-sm font-bold tracking-widest text-emerald-500">IDENTIDAD DIGITAL C4ISR</h1>
      </header>

      <main class="p-4 max-w-md mx-auto relative animate-fade-in-up">

         <!-- ID CARD (Cyberpunk Style) -->
         <div class="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl overflow-hidden mb-8 group">
            
            <!-- Holographic Overlay FX -->
            <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bT1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC41Ii8+PC9zdmc+');"></div>
            <div class="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
            
            <div class="relative z-10 flex flex-col items-center">
               
               <!-- Avatar Edit -->
               <div class="relative mb-4">
                  <div class="w-24 h-24 rounded-full border-4 border-slate-800 p-1 bg-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)] overflow-hidden">
                     <img [src]="effectiveAvatar()" 
                          class="w-full h-full rounded-full object-cover"
                          alt="Avatar de Usuario"
                          (error)="onAvatarLoadError($event)">
                  </div>
                  <button (click)="changeAvatar()" aria-label="Cambiar foto de perfil" class="absolute bottom-0 right-0 p-2 bg-slate-700 hover:bg-emerald-600 rounded-full text-white shadow-lg transition-colors border border-slate-900 cursor-pointer">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </button>
               </div>

               <!-- User Info -->
               <h2 class="text-2xl font-black text-white tracking-tight mb-1 text-center">
                 {{ displayName() }}
               </h2>
               <div class="text-xs text-emerald-400 font-mono uppercase tracking-widest mb-4">
                 ID: {{ displayId() }}
               </div>

               <!-- Rank Badge -->
               <div class="flex flex-col items-center gap-1 mb-6 w-full">
                  <div class="text-[10px] text-slate-300 font-bold uppercase tracking-wider">RANGO ACTUAL</div>
                  <div class="flex items-center gap-3 px-4 py-2 bg-slate-950/70 rounded-lg border border-slate-700/60 w-full justify-center shadow-inner">
                     <span class="text-3xl">{{ rankInfo().currentRank.icon }}</span>
                     <div class="flex flex-col items-start">
                        <span class="text-lg font-black tracking-widest" [style.color]="rankInfo().currentRank.color">
                          {{ rankInfo().currentRank.name }}
                        </span>
                        <span class="text-[10px] text-slate-400">{{ rankInfo().currentRank.benefit }}</span>
                     </div>
                  </div>
               </div>

               <!-- Progress Bar -->
               <div class="w-full">
                  <div class="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                     <span>NIVEL {{ rankInfo().currentRank.name }}</span>
                     @if (!rankInfo().isMaxLevel) {
                       <span>{{ rankInfo().pointsToNext }} pts para {{ rankInfo().currentRank.nextRankName }}</span>
                     } @else {
                       <span class="text-amber-400 font-bold">RANGO MÁXIMO C4ISR</span>
                     }
                  </div>
                  <div class="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                     <div class="h-full transition-all duration-1000 ease-out relative"
                          [ngClass]="{
                            'bg-gradient-to-r from-red-600 to-red-400': userScore() <= 300,
                            'bg-gradient-to-r from-blue-600 to-blue-400': userScore() > 300 && userScore() <= 700,
                            'bg-gradient-to-r from-emerald-600 to-emerald-400': userScore() > 700
                          }"
                          [style.width.%]="rankInfo().progressPercent">
                          <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                     </div>
                  </div>
                  <div class="text-right mt-1 text-[10px] text-emerald-400 font-bold font-mono">
                    {{ userScore() }} PTS TOTALES
                  </div>
               </div>

            </div>
         </div>

         <!-- STATS GRID -->
         <div class="grid grid-cols-3 gap-3 mb-8">
            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
               <div class="text-2xl font-bold text-white mb-1">{{ totalReports() }}</div>
               <div class="text-[9px] text-slate-300 uppercase font-bold">REPORTES</div>
            </div>
            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
               <div class="text-2xl font-bold text-emerald-400 mb-1">{{ validatedReports() }}</div>
               <div class="text-[9px] text-slate-300 uppercase font-bold">VALIDADOS</div>
            </div>
            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
               <div class="text-2xl font-bold text-blue-400 mb-1">{{ trustPercent() }}%</div>
               <div class="text-[9px] text-slate-300 uppercase font-bold">CONFIANZA</div>
            </div>
         </div>

         <!-- GROWTH ACTION -->
         <button (click)="inviteFriend()" class="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-blue-900/30 flex items-center justify-center gap-3 active:scale-95 transition-all mb-8 relative overflow-hidden group cursor-pointer">
            <div class="absolute inset-0 bg-white/10 -translate-x-full skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
            <span class="text-2xl">🔗</span>
            <div class="text-left">
               <div class="text-sm">INVITAR VECINO</div>
               <div class="text-[10px] text-blue-200 uppercase font-normal">+100 PUNTOS POR REFERIDO</div>
            </div>
         </button>
         
         <!-- EDIT FORM -->
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
            <h3 class="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">DATOS DE CONTACTO</h3>
            
            <div class="mb-4">
              <label class="block text-[10px] text-slate-400 mb-1">TELÉFONO (WhatsApp)</label>
              <input type="tel" [(ngModel)]="phone" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none transition-colors" placeholder="+54 9 ...">
            </div>

             <button (click)="saveProfile()" [disabled]="isSaving()" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-colors cursor-pointer">
               {{ isSaving() ? 'GUARDANDO...' : 'GUARDAR CAMBIOS' }}
             </button>
          </div>
         
         <div class="flex flex-col gap-4 text-center mt-8">
           <!-- Admin Access -->
           @if (isAdmin()) {
             <button (click)="goToAdmin()" class="w-full py-3 bg-red-900/30 border border-red-500/60 text-red-400 font-bold rounded-xl hover:bg-red-900/50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/40">
                <span>🛡️</span> PANEL DE COMANDO C4ISR
             </button>
           }

           <button (click)="logout()" class="text-xs text-slate-300 hover:text-white font-bold underline decoration-slate-800 underline-offset-4 cursor-pointer">
             CERRAR SESIÓN
           </button>
           
           <button (click)="deleteAccount()" class="text-[10px] text-red-900 hover:text-red-600 transition-colors uppercase font-bold tracking-widest mt-4 cursor-pointer">
             ELIMINAR MI CUENTA PERMANENTEMENTE
           </button>
         </div>

      </main>
    </div>
  `,
  styles: [`
    .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class UserProfileComponent implements OnInit {
  private router = inject(Router);
  public auth = inject(AuthService);
  private game = inject(GamificationService);
  private camera = inject(CameraService);
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private injector = inject(Injector);

  profile = signal<Profile | null>(null);
  authName = signal<string>('');
  userScore = signal(100);
  
  // Safe default rankInfo initialization (never null)
  rankInfo = signal<RankProgress>(this.game.calculateProgress(100, 'Cadete'));

  // Resilient Computed Properties
  isAdmin = computed(() => this.auth.isAdmin());

  displayName = computed(() => {
    const prof = this.profile();
    const userMeta = this.auth.currentUser()?.user_metadata;
    return prof?.username || prof?.full_name || this.authName() || userMeta?.['full_name'] || userMeta?.['name'] || 'Agente';
  });

  displayId = computed(() => {
    const prof = this.profile();
    if (prof?.display_id) return prof.display_id;
    const rawId = prof?.id || this.auth.currentUser()?.id || '00000000';
    return 'ZARX-' + rawId.slice(0, 8).toUpperCase();
  });

  effectiveAvatar = computed(() => {
    const preview = this.avatarPreview();
    if (preview) return preview;
    if (this.avatarLoadError()) return AppConstants.ASSETS.IMAGES.AVATAR_PLACEHOLDER;
    const profAvatar = this.profile()?.avatar_url;
    if (profAvatar && profAvatar.trim()) return profAvatar;
    const metaAvatar = this.auth.currentUser()?.user_metadata?.['avatar_url'] || this.auth.currentUser()?.user_metadata?.['picture'];
    if (metaAvatar && metaAvatar.trim()) return metaAvatar;
    return AppConstants.ASSETS.IMAGES.AVATAR_PLACEHOLDER;
  });

  // Stats (real data from DB)
  totalReports = signal(0);
  validatedReports = signal(0);
  trustPercent = signal(0);
  
  // Edit State
  phone = '';
  avatarPreview = signal<SafeUrl | null>(null);
  avatarBlob: Blob | null = null;
  isSaving = signal(false);
  avatarLoadError = signal(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
     // Reactive Data Loading
     effect(() => {
        const user = this.auth.currentUser();
        if (user) {
           this.loadProfile(user.id);
           
           if (user.user_metadata?.['full_name']) {
              this.authName.set(user.user_metadata['full_name']);
           }
        }
     }, { injector: this.injector });
  }

  ngOnInit() {
    this.refreshRank();
  }

  async loadProfile(userId: string) {
    try {
      const { data } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
         this.profile.set(data as Profile); 
         this.userScore.set(data.reputation_score ?? 100); 
         this.phone = data.phone || '';
         this.refreshRank();
         this.loadUserStats(userId);
      }
    } catch (e) {
      Logger.warn('[UserProfile] loadProfile error:', e);
    }
  }

  private async loadUserStats(userId: string) {
    try {
      // Total reports by user
      const { count: total } = await this.supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Validated reports
      const { count: validated } = await this.supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['VALIDATED', 'RESOLVED']);

      const totalCount = total || 0;
      const validatedCount = validated || 0;

      this.totalReports.set(totalCount);
      this.validatedReports.set(validatedCount);
      this.trustPercent.set(totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 100);
    } catch (e) {
      Logger.warn('Could not load user stats:', e);
    }
  }

  refreshRank() {
     const explicitRank = this.profile()?.rank;
     const info = this.game.calculateProgress(this.userScore(), explicitRank);
     this.rankInfo.set(info);
  }

  async changeAvatar() {
    try {
      const photo = await this.camera.capturePhoto();
      if (photo?.dataUrl) {
         const response = await fetch(photo.dataUrl);
         const blob = await response.blob();
         
         this.avatarBlob = blob;
         this.avatarLoadError.set(false);
         this.avatarPreview.set(this.sanitizer.bypassSecurityTrustUrl(photo.dataUrl));
      }
    } catch (e) {
      Logger.warn('[UserProfile] changeAvatar cancelled or error:', e);
    }
  }

  onAvatarLoadError(event: Event) {
    this.avatarLoadError.set(true);
    (event.target as HTMLImageElement).src = AppConstants.ASSETS.IMAGES.AVATAR_PLACEHOLDER;
  }

  async saveProfile() {
    const currentProfile = this.profile();
    if (!currentProfile) return;

    this.isSaving.set(true);
    try {
      const updates: Partial<Profile> = { phone: this.phone };

      // Avatar Upload
      if (this.avatarBlob) {
         const bucket = AppConstants.CONFIG.STORAGE.BUCKET_AVATARS;
         const fileName = `${currentProfile.id}_${Date.now()}.jpg`;
         
         Logger.debug('📤 Uploading avatar:', fileName);
         
         const { error: uploadError } = await this.supabase.storage
            .from(bucket) 
            .upload(fileName, this.avatarBlob, { 
              upsert: true,
              contentType: 'image/jpeg'
            });

         if (uploadError) {
             console.error('❌ Avatar Upload Error:', uploadError);
             this.toast.error("Error al subir imagen: " + uploadError.message);
             throw uploadError;
         } else {
             const { data: { publicUrl } } = this.supabase.storage.from(bucket).getPublicUrl(fileName);
             updates.avatar_url = publicUrl;
             Logger.debug('✅ Avatar uploaded:', publicUrl);
         }
      }

      const { error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentProfile.id);
      
      if (error) throw error;
      
      this.toast.success("✅ Perfil actualizado correctamente");
      
      await this.loadProfile(currentProfile.id);
      await this.auth.refreshProfile();
      
      this.avatarBlob = null;
      this.avatarPreview.set(null);
      this.avatarLoadError.set(false);

    } catch (e: any) {
      console.error('❌ Save profile error:', e);
      if (e.message) {
         this.toast.error("Error: " + e.message);
      } else {
         this.toast.error("Error al guardar perfil");
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  inviteFriend() {
    const code = this.displayId();
    const appUrl = (typeof window !== 'undefined') ? window.location.origin : 'https://zarx.arecofix.com.ar';
    if (typeof navigator !== 'undefined' && navigator.share) {
       navigator.share({
         title: 'Únete a ZARX - Marcos Paz',
         text: `Te invito a unirte a la red C4ISR de alerta temprana y seguridad vecinal ZARX. Usa mi código ${code} para sumar reputación.`,
         url: appUrl
       }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
       navigator.clipboard.writeText(appUrl);
       this.toast.info("Link copiado al portapapeles");
    }
  }

  goHome() {
    this.router.navigate(['/inicio']);
  }

  goToAdmin() {
    this.router.navigate(['/admin/dashboard']);
  }

  logout() {
    this.auth.signOut();
  }

  async deleteAccount() {
    if (confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsta acción eliminará permanentemente tu cuenta, historial de reportes y puntaje. NO se puede deshacer.")) {
       const user = this.auth.currentUser();
       if (!user) return;
       
       try {
         const { error } = await this.supabase.rpc('delete_own_account');
         
         if (error) throw error;
         
         this.toast.success("Cuenta eliminada permanentemente.");
         await this.auth.signOut();
         this.router.navigate(['/']);
         
       } catch (e) {
         console.error(e);
         this.toast.error("Error al procesar la baja. Intente más tarde.");
       }
    }
  }
}
