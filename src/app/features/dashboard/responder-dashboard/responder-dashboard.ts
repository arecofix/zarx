import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-responder-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-zarx-dark bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-slate-900 to-black text-white p-4 font-sans selection:bg-sky-500/30">
      
      <!-- TOP BAR -->
      <header class="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <div>
          <h1 class="text-2xl font-black tracking-tighter">MISSION <span class="text-sky-500">CONTROL</span></h1>
          <p class="text-xs text-slate-400 font-mono tracking-widest uppercase">Unit: {{ auth.currentUser()?.email }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex flex-col items-end">
            <span class="text-[10px] uppercase text-slate-300 font-bold">Status</span>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" [class.bg-green-500]="isOnline()" [class.bg-slate-600]="!isOnline()"></span>
              <span class="font-bold text-sm" [class.text-green-400]="isOnline()" [class.text-slate-400]="!isOnline()">
                {{ isOnline() ? 'ACTIVE' : 'OFFLINE' }}
              </span>
            </div>
          </div>
          <button (click)="toggleStatus()" class="p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
          </button>
          <button (click)="logout()" class="p-2 bg-red-500/10 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition text-red-500">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
             </svg>
          </button>
        </div>
      </header>

      <!-- DASHBOARD GRID -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <!-- WIDGET: ACTIVE ALERTS -->
        <div class="col-span-1 md:col-span-2 lg:col-span-2 bg-slate-900/50 rounded-xl border border-white/5 p-5 backdrop-blur-sm relative overflow-hidden group">
           <div class="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
           <div class="flex justify-between items-start mb-4">
             <h2 class="text-lg font-bold flex items-center gap-2">
               <svg class="h-5 w-5 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               PRIORITY INCIDENTS
             </h2>
             <span class="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded font-mono">LIVE FEED</span>
           </div>
           
           <!-- MOCK ALERT LIST -->
           <div class="space-y-3">
             <div class="bg-black/40 p-4 rounded-lg border-l-4 border-red-500 hover:bg-white/5 transition cursor-pointer">
                <div class="flex justify-between items-start">
                   <div>
                     <h3 class="font-bold text-red-400">SOS: CARDIAC ARREST</h3>
                     <p class="text-sm text-slate-300">Sector 7G • 200m Away</p>
                     <div class="mt-2 flex gap-2">
                       <span class="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">Civilian</span>
                       <span class="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">High Urgency</span>
                     </div>
                   </div>
                   <button class="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold text-xs uppercase transition">RESPOND</button>
                </div>
             </div>

             <div class="bg-black/40 p-4 rounded-lg border-l-4 border-yellow-500 hover:bg-white/5 transition cursor-pointer">
                <div class="flex justify-between items-start">
                   <div>
                     <h3 class="font-bold text-yellow-500">SUSPICIOUS ACTIVITY</h3>
                     <p class="text-sm text-slate-300">Downtown Plaza • 1.2km Away</p>
                   </div>
                   <button class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-bold text-xs uppercase transition">ACKNOWLEDGE</button>
                </div>
             </div>
           </div>
        </div>

        <!-- WIDGET: STATS -->
        <div class="bg-slate-900/50 rounded-xl border border-white/5 p-5 backdrop-blur-sm">
           <h2 class="text-lg font-bold mb-4 text-slate-200">UNIT STATS</h2>
           <div class="grid grid-cols-2 gap-3">
              <div class="bg-black/30 p-3 rounded-lg text-center">
                 <p class="text-2xl font-black text-white">12</p>
                 <p class="text-[10px] uppercase text-slate-300 tracking-wider">Missions</p>
              </div>
              <div class="bg-black/30 p-3 rounded-lg text-center">
                 <p class="text-2xl font-black text-sky-400">4.5h</p>
                 <p class="text-[10px] uppercase text-slate-300 tracking-wider">Patrol Time</p>
              </div>
              <div class="bg-black/30 p-3 rounded-lg text-center col-span-2">
                 <p class="text-xl font-bold text-green-400">EXCELLENT</p>
                 <p class="text-[10px] uppercase text-slate-300 tracking-wider">Performance Rating</p>
              </div>
           </div>
        </div>

        <!-- QUICK ACTIONS -->
        <div class="col-span-1 md:col-span-3 bg-slate-900/50 rounded-xl border border-white/5 p-5 backdrop-blur-sm">
           <h2 class="text-sm font-bold uppercase text-slate-300 mb-3 tracking-wider">Quick Actions</h2>
           <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button (click)="navToMap()" class="p-4 bg-sky-600/20 border border-sky-500/30 rounded-lg hover:bg-sky-600/30 transition flex flex-col items-center gap-2 group">
                 <svg class="h-6 w-6 text-sky-400 group-hover:scale-110 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-1.447-.894L15 7m0 13V7" /></svg>
                 <span class="text-xs font-bold text-sky-200">OPEN MAP</span>
              </button>
              <button class="p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition flex flex-col items-center gap-2 group">
                 <svg class="h-6 w-6 text-purple-400 group-hover:scale-110 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                 <span class="text-xs font-bold text-purple-200">REPORT LOG</span>
              </button>
              <button class="p-4 bg-orange-600/20 border border-orange-500/30 rounded-lg hover:bg-orange-600/30 transition flex flex-col items-center gap-2 group">
                 <svg class="h-6 w-6 text-orange-400 group-hover:scale-110 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 <span class="text-xs font-bold text-orange-200">SETTINGS</span>
              </button>
           </div>
        </div>

      </div>
    </div>
  `
})
export class ResponderDashboard {
  auth = inject(AuthService);
  router = inject(Router);
  
  isOnline = signal(true);

  toggleStatus() {
    this.isOnline.update(v => !v);
  }

  navToMap() {
    this.router.navigate(['/inicio']);
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/auth/login']);
  }
}
