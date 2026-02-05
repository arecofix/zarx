import { Component, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppConstants } from '../../core/constants/app.constants';
import { MediaUploadService } from '../../core/services/media-upload.service';
import { CameraService } from '../../core/services/camera.service';
import { ToastService } from '../../core/services/toast.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { InviteCardComponent } from '../../shared/components/invite-card/invite-card.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, InviteCardComponent],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6 pt-20">
      
      <!-- HEADER -->
      <header class="flex items-center gap-4 mb-12">
        <button (click)="goBack()" class="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400">
           <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 class="text-2xl font-black tracking-tight">{{ UI.PROFILE.TITLE }}</h1>
      </header>
      
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 relative overflow-hidden">
          <div class="absolute top-0 right-0 p-4 opacity-10">
             <svg class="w-32 h-32 text-white transform rotate-12 -mr-8 -mt-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>

          <div class="relative z-10 flex flex-col items-center sm:flex-row sm:items-start gap-6">
             <!-- Avatar Section -->
             <div class="relative group">
                <div class="w-24 h-24 rounded-full border-2 border-emerald-500/50 overflow-hidden bg-slate-800 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                   @if (auth.profile()?.avatar_url) {
                      <img [src]="auth.profile()?.avatar_url" class="w-full h-full object-cover">
                   } @else {
                      <div class="w-full h-full flex items-center justify-center text-slate-500 text-3xl">
                         {{ (auth.profile()?.username || 'Z')[0].toUpperCase() }}
                      </div>
                   }
                </div>
                <button 
                  (click)="changeAvatar()"
                  [disabled]="isUploading()"
                  class="absolute bottom-0 right-0 p-2 bg-emerald-500 text-black rounded-full shadow-lg hover:bg-emerald-400 transition-all active:scale-95 disabled:grayscale"
                >
                   @if (isUploading()) {
                      <div class="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                   } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                   }
                </button>
             </div>

             <div class="text-center sm:text-left">
                <h2 class="text-2xl font-black text-white mb-1">
                   {{ auth.profile()?.username ? '@' + auth.profile()?.username : 'Usuario Anónimo' }}
                </h2>
                <p class="text-slate-500 text-sm mb-4">{{ auth.currentUser()?.email }}</p>
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span class="w-2 h-2 rounded-full" [ngClass]="auth.isAdmin() ? 'bg-red-500 pulse-red' : 'bg-emerald-500 pulse-green'"></span>
                  {{ auth.profile()?.role || 'CIVILIAN' }}
                </div>
             </div>
          </div>
      </div>

      <!-- ADMIN ACCESS (OPEN TO ALL FOR DEMO) -->
      @if (auth.isAdmin()) {
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div class="flex items-center gap-2 mb-4">
              <span class="h-px flex-1 bg-slate-800"></span>
              <span class="text-[10px] uppercase font-mono text-red-500 tracking-widest font-bold">{{ UI.PROFILE.RESTRICTED_ZONE }}</span>
              <span class="h-px flex-1 bg-slate-800"></span>
           </div>

           <a routerLink="/admin/dashboard" class="w-full py-4 bg-red-900/20 hover:bg-red-900/30 border border-red-900/50 text-red-500 font-bold font-mono rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all group">
             <span class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
             </span>
             {{ UI.PROFILE.ADMIN_PANEL }}
             <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
           </a>
        </div>
      }


      <!-- REFERRAL SECTION -->
      <!-- REFERRAL SECTION -->
       <div class="mt-8">
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">MI RED VECINAL</h3>
          <app-invite-card></app-invite-card>
       </div>

      <!-- SETTINGS SECTION -->
      <div class="mt-8">
         <h3 class="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">{{ UI.PROFILE.SETTINGS }}</h3>
         
         <!-- PRIVACY GROUP -->
         <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div class="p-4 border-b border-slate-800 flex items-center gap-3">
               <div class="p-2 bg-slate-800 rounded-lg text-slate-400">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
               </div>
               <div>
                  <h4 class="text-sm font-bold text-white">{{ UI.PROFILE.PRIVACY }}</h4>
                  <p class="text-[10px] text-slate-300">{{ UI.PROFILE.PRIVACY_DESC }}</p>
               </div>
            </div>

            <div class="p-4">
               <button (click)="requestDataDeletion()" class="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-bold rounded-lg transition-colors flex items-center justify-between group">
                  <span>{{ UI.PROFILE.DELETE_DATA }}</span>
                  <svg class="w-4 h-4 opacity-50 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
               </button>
               <p class="mt-2 text-[10px] text-slate-600 leading-relaxed">
                  {{ UI.PROFILE.DELETE_WARNING }}
               </p>
            </div>
         </div>
      </div>

      <!-- LOGOUT -->
      <div class="mt-8">
         <button (click)="auth.signOut()" class="w-full py-3 text-slate-400 hover:text-white text-sm font-bold tracking-wide transition-colors">
            {{ UI.PROFILE.LOGOUT }}
         </button>
      </div>

    </div>
  `,
  styles: [`
    @keyframes pulse-ring {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    @keyframes pulse-ring-red {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .pulse-green { animation: pulse-ring 2s infinite; }
    .pulse-red { animation: pulse-ring-red 2s infinite; }
  `]
})
export class ProfileComponent {
  auth = inject(AuthService);
  UI = AppConstants.UI;
  private camera = inject(CameraService);
  private upload = inject(MediaUploadService);
  private toast = inject(ToastService);
  private supabase = inject(SupabaseService).client;
  private location = inject(Location);
  
  isUploading = signal(false);

  async changeAvatar() {
    const user = this.auth.currentUser();
    if (!user) return;

    try {
      const photo = await this.camera.capturePhoto();
      if (!photo) return;

      this.isUploading.set(true);
      
      const blob = await fetch(photo.dataUrl).then(r => r.blob());
      const publicUrl = await this.upload.uploadAvatar(blob, user.id);

      if (publicUrl) {
        const { error } = await this.supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (error) throw error;
        
        this.toast.success('¡Foto de perfil actualizada!');
        // Trigger profile refresh
        this.auth.waitForAuthInit(); 
      }
    } catch (e: any) {
      this.toast.error('Error al subir imagen');
      console.error(e);
    } finally {
      this.isUploading.set(false);
    }
  }

  async requestDataDeletion() {
    // NOTE: Ideally use a Modal Service here. Using confirm for now but wrapped for clarity.
    if (confirm(this.UI.PROFILE.CONFIRM_DELETE)) {
       // Logic for deletion
       alert('Solicitud procesada.');
    }
  }

  goBack() {
    this.location.back();
  }
}
