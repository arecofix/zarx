import { Component, Inject, inject, OnInit, PLATFORM_ID, signal, Injector, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { GamificationService, Rank } from '../../../../core/services/gamification.service';
import { CameraService } from '../../../../core/services/camera.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Profile } from '../../../../core/models';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-200 pb-20 font-mono overflow-y-auto">
      
      <!-- NAV HEADER -->
      <header class="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800 p-4 flex items-center justify-between">
         <button (click)="goHome()" class="text-slate-400 hover:text-white flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            VOLVER
         </button>
         <h1 class="text-sm font-bold tracking-widest text-emerald-500">IDENTIDAD DIGITAL</h1>
      </header>

      <main class="p-4 max-w-md mx-auto relative animate-fade-in-up">

         <!-- ID CARD (Cyberpunk Style) -->
         <div class="relative bg-linear-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl overflow-hidden mb-8 group">
            
            <!-- Holographic Overlay FX -->
            <!-- Holographic Overlay FX -->
            <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bT1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC41Ii8+PC9zdmc+');"></div>
            <div class="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
            
            <div class="relative z-10 flex flex-col items-center">
               
               <!-- Avatar Edit -->
               <div class="relative mb-4">
                  <div class="w-24 h-24 rounded-full border-4 border-slate-800 p-1 bg-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                     <img [src]="avatarPreview() || profile()?.avatar_url || 'assets/images/placeholder_avatar.png'" 
                          class="w-full h-full rounded-full object-cover"
                          (error)="onAvatarLoadError($event)">
                  </div>
                  <button (click)="changeAvatar()" class="absolute bottom-0 right-0 p-2 bg-slate-700 hover:bg-emerald-600 rounded-full text-white shadow-lg transition-colors border border-slate-900">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </button>
               </div>

               <!-- User Info -->
               <h2 class="text-2xl font-black text-white tracking-tight mb-1">{{ profile()?.username || profile()?.full_name || authName() || 'Agente Anónimo' }}</h2>
               <div class="text-xs text-slate-400 uppercase tracking-widest mb-4">ID: {{ profile()?.id | slice:0:8 }}</div>

               <!-- Rank Badge -->
               <div class="flex flex-col items-center gap-1 mb-6 w-full">
                  <div class="text-[10px] text-slate-300 font-bold uppercase">RANGO ACTUAL</div>
                  <div class="flex items-center gap-2 px-4 py-2 bg-slate-950/50 rounded-lg border border-slate-700/50 w-full justify-center">
                     <span class="text-2xl">{{ rankInfo()?.currentRank?.icon }}</span>
                     <div class="flex flex-col items-start">
                        <span class="text-lg font-black tracking-widest" [class]="'text-' + rankInfo()?.currentRank?.color">{{ rankInfo()?.currentRank?.name }}</span>
                        <span class="text-[10px] text-slate-400">{{ rankInfo()?.currentRank?.benefit }}</span>
                     </div>
                  </div>
               </div>

               <!-- Progress Bar -->
               <div class="w-full">
                  <div class="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                     <span>NIVEL {{ rankInfo()?.currentRank?.name }}</span>
                     @if (!rankInfo()?.isMaxLevel) {
                       <span>{{ rankInfo()?.pointsToNext }} pts para {{ rankInfo()?.currentRank?.nextRankName }}</span>
                     } @else {
                       <span>MAX LEVEL</span>
                     }
                  </div>
                  <div class="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                     <div class="h-full transition-all duration-1000 ease-out relative"
                          [ngClass]="{
                            'bg-linear-to-r from-red-600 to-red-400': userScore() <= 300,
                            'bg-linear-to-r from-blue-600 to-blue-400': userScore() > 300 && userScore() <= 700,
                            'bg-linear-to-r from-emerald-600 to-emerald-400': userScore() > 700
                          }"
                          [style.width.%]="rankInfo()?.progressPercent">
                          <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                     </div>
                  </div>
                  <div class="text-right mt-1 text-[10px] text-emerald-400 font-bold">{{ userScore() }} PTS TOTALES</div>
               </div>

            </div>
         </div>

         <!-- STATS GRID -->
         <div class="grid grid-cols-3 gap-3 mb-8">
            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
               <div class="text-2xl font-bold text-white mb-1">12</div>
               <div class="text-[9px] text-slate-300 uppercase font-bold">REPORTES</div>
            </div>
            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
               <div class="text-2xl font-bold text-emerald-400 mb-1">8</div>
               <div class="text-[9px] text-slate-300 uppercase font-bold">VALIDADOS</div>
            </div>
            <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
               <div class="text-2xl font-bold text-blue-400 mb-1">98%</div>
               <div class="text-[9px] text-slate-300 uppercase font-bold">CONFIANZA</div>
            </div>
         </div>

         <!-- GROWTH ACTION -->
         <button (click)="inviteFriend()" class="w-full py-4 bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-blue-900/30 flex items-center justify-center gap-3 active:scale-95 transition-all mb-8 relative overflow-hidden group">
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

             <button (click)="saveProfile()" [disabled]="isSaving()" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-colors">
               {{ isSaving() ? 'GUARDANDO...' : 'GUARDAR CAMBIOS' }}
             </button>
          </div>
         
         <div class="flex flex-col gap-4 text-center mt-8">
           <!-- Admin Access -->
           @if (isAdmin()) {
             <button (click)="goToAdmin()" class="w-full py-3 bg-red-900/20 border border-red-500/50 text-red-400 font-bold rounded-xl hover:bg-red-900/40 transition-all flex items-center justify-center gap-2">
                <span>🛡️</span> PANEL DE COMANDO
             </button>
           }

           <button (click)="logout()" class="text-xs text-slate-300 hover:text-white font-bold underline decoration-slate-800 underline-offset-4">CERRAR SESIÓN</button>
           
           <button (click)="deleteAccount()" class="text-[10px] text-red-900 hover:text-red-600 transition-colors uppercase font-bold tracking-widest mt-4">ELIMINAR MI CUENTA PERMANENTEMENTE</button>
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
  private auth = inject(AuthService);
  private game = inject(GamificationService);
  private camera = inject(CameraService);
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  profile = signal<Profile | null>(null);
  authName = signal<string>('');
  isAdmin = signal(false);
  userScore = signal(0); 
  rankInfo = signal<any>(null);
  
  // Edit State
  phone = '';
  avatarPreview = signal<SafeUrl | null>(null);
  avatarBlob: Blob | null = null;
  isSaving = signal(false);
  avatarLoadError = signal(false);

  private injector = inject(Injector);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
     // Reactive Data Loading
     effect(() => {
        const user = this.auth.currentUser();
        if (user) {
           this.loadProfile(user.id);
           
           // Auth Metadata Fallback
           if (user.user_metadata?.['full_name']) {
              this.authName.set(user.user_metadata['full_name']);
           }
        }
     }, { injector: this.injector });
  }

  ngOnInit() {
    // Logic moved to constructor effect for full reactivity
  }

  async loadProfile(userId: string) {
    const { data } = await this.supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
       console.log('📋 Profile loaded:', data); // Debug
       this.profile.set(data as any); 
       
       this.userScore.set(data.reputation_score || 150); 
       this.phone = data.phone || '';
       this.isAdmin.set(data.role === 'admin');
       this.refreshRank();
    }
  }

  refreshRank() {
     const info = this.game.calculateProgress(this.userScore());
     this.rankInfo.set(info);
  }

  async changeAvatar() {
    const photo = await this.camera.capturePhoto();
    if (photo) {
       // Convert data URL to blob
       const response = await fetch(photo.dataUrl);
       const blob = await response.blob();
       
       this.avatarBlob = blob;
       this.avatarPreview.set(this.sanitizer.bypassSecurityTrustUrl(photo.dataUrl));
    }
  }

  onAvatarLoadError(event: Event) {
    console.warn('Avatar failed to load, using fallback');
    this.avatarLoadError.set(true);
    // Set fallback image
    (event.target as HTMLImageElement).src = 'assets/images/placeholder_avatar.png';
  }

  async saveProfile() {
    const currentProfile = this.profile();
    if (!currentProfile) return;

    this.isSaving.set(true);
    try {
      const updates: any = { phone: this.phone };

      // Avatar Upload
      if (this.avatarBlob) {
         const fileName = `${currentProfile.id}_${Date.now()}.jpg`;
         
         console.log('📤 Uploading avatar:', fileName);
         
         const { data: uploadData, error: uploadError } = await this.supabase.storage
            .from('avatars') 
            .upload(fileName, this.avatarBlob, { 
              upsert: true, // Allow overwrite
              contentType: 'image/jpeg'
            });

         if (uploadError) {
             console.error('❌ Avatar Upload Error:', uploadError);
             if (uploadError.message.includes('Bucket not found')) {
                 this.toast.error("Error: Bucket 'avatars' no existe. Ejecute el script SQL.");
             } else {
                 this.toast.error("Error al subir imagen: " + uploadError.message);
             }
             throw uploadError;
         } else {
             const { data: { publicUrl } } = this.supabase.storage.from('avatars').getPublicUrl(fileName);
             updates.avatar_url = publicUrl;
             console.log('✅ Avatar uploaded:', publicUrl);
         }
      }

      const { error } = await this.supabase.from('profiles').update(updates).eq('id', currentProfile.id);
      
      if (error) throw error;
      
      this.toast.success("✅ Perfil actualizado correctamente");
      
      // Reload profile to get fresh data
      await this.loadProfile(currentProfile.id);
      
      // Clear blobs and preview
      this.avatarBlob = null;
      this.avatarPreview.set(null);
      this.avatarLoadError.set(false);

    } catch (e: any) {
      console.error('❌ Save profile error:', e);
      if (e.code === '42703') {
         this.toast.error("Error de BD: Columna faltante. Ejecute el script SQL.");
      } else if (e.message) {
         this.toast.error("Error: " + e.message);
      } else {
         this.toast.error("Error desconocido al guardar perfil");
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  inviteFriend() {
    const currentProfile = this.profile();
    if (typeof navigator !== 'undefined' && navigator.share) {
       navigator.share({
         title: 'Únete a ZARX',
         text: `Te invito a unirte a la red de seguridad vecinal ZARX. Usa mi código ${currentProfile?.id.slice(0,6)} para sumar puntos.`,
         url: 'https://zarx-arecofix.web.app'
       });
    } else {
       // Clipboard fallback
       navigator.clipboard.writeText('https://zarx-arecofix.web.app');
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
