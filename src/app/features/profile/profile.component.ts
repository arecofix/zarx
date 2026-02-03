import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppConstants } from '../../core/constants/app.constants';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6 pt-20">
      
      <!-- HEADER -->
      <header class="flex items-center gap-4 mb-12">
        <a routerLink="/inicio" class="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400">
           <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </a>
        <h1 class="text-2xl font-black tracking-tight">{{ UI.PROFILE.TITLE }}</h1>
      </header>
      
      <!-- USER CARD -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 relative overflow-hidden">
         <div class="absolute top-0 right-0 p-4 opacity-50">
            <svg class="w-24 h-24 text-slate-800 transform rotate-12 -mr-8 -mt-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
         </div>

         <div class="relative z-10">
            <h2 class="text-xl font-bold text-white mb-1">{{ auth.currentUser()?.email }}</h2>
            <div class="inline-flex items-center gap-2 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-400 uppercase">
              <span class="w-2 h-2 rounded-full" [ngClass]="auth.isAdmin() ? 'bg-red-500' : 'bg-emerald-500'"></span>
              {{ auth.profile()?.role || 'CIVILIAN' }}
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

      <!-- SETTINGS SECTION -->
      <div class="mt-8">
         <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{{ UI.PROFILE.SETTINGS }}</h3>
         
         <!-- PRIVACY GROUP -->
         <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div class="p-4 border-b border-slate-800 flex items-center gap-3">
               <div class="p-2 bg-slate-800 rounded-lg text-slate-400">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
               </div>
               <div>
                  <h4 class="text-sm font-bold text-white">{{ UI.PROFILE.PRIVACY }}</h4>
                  <p class="text-[10px] text-slate-500">{{ UI.PROFILE.PRIVACY_DESC }}</p>
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
  `
})
export class ProfileComponent {
  auth = inject(AuthService);
  UI = AppConstants.UI;

  async requestDataDeletion() {
    // NOTE: Ideally use a Modal Service here. Using confirm for now but wrapped for clarity.
    if (confirm(this.UI.PROFILE.CONFIRM_DELETE)) {
       // Logic for deletion
       alert('Solicitud procesada.');
    }
  }
}
