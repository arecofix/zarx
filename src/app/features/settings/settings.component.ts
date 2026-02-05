import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6 pt-20">
      
      <!-- HEADER -->
      <header class="flex items-center gap-4 mb-8">
        <a routerLink="/inicio" class="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400">
           <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </a>
        <h1 class="text-2xl font-black tracking-tight">AJUSTES</h1>
      </header>

      <div class="space-y-6">
        
        <!-- Section: Notificaciones -->
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
           <h3 class="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">NOTIFICACIONES</h3>
           
           <div class="flex items-center justify-between mb-4">
             <span class="text-sm">Alertas de Emergencia (Push)</span>
             <input type="checkbox" checked class="accent-emerald-500 w-5 h-5 rounded cursor-pointer">
           </div>
           
           <div class="flex items-center justify-between">
             <span class="text-sm">Boletín Informativo</span>
             <input type="checkbox" class="accent-slate-500 w-5 h-5 rounded cursor-pointer">
           </div>
        </div>

        <!-- Section: General -->
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
           <h3 class="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">GENERAL</h3>
           
           <div class="flex items-center justify-between mb-4">
             <span class="text-sm">Tema Oscuro</span>
             <span class="text-xs text-slate-300 uppercase">Activo (Forzado)</span>
           </div>
           
           <div class="flex items-center justify-between">
             <span class="text-sm">Idioma</span>
             <span class="text-xs text-slate-400">Español</span>
           </div>
        </div>

        <!-- Section: Privacidad -->
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
           <h3 class="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">PRIVACIDAD</h3>
           
           <div class="flex items-center justify-between">
             <div class="pr-4">
               <span class="text-sm block">Retención de Datos Limitada</span>
               <p class="text-[10px] text-slate-300 mt-1">Eliminar automáticamente mi historial de actividad y ubicaciones con más de 90 días de antigüedad.</p>
             </div>
             <button (click)="toggleAutoDelete()" 
                     class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                     [class.bg-emerald-500]="autoDeleteEnabled"
                     [class.bg-slate-700]="!autoDeleteEnabled">
                <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      [class.translate-x-6]="autoDeleteEnabled"
                      [class.translate-x-1]="!autoDeleteEnabled"></span>
             </button>
           </div>
        </div>

      </div>

    </div>
  `
})
export class SettingsComponent {
  autoDeleteEnabled = false;

  toggleAutoDelete() {
    this.autoDeleteEnabled = !this.autoDeleteEnabled;
    const msg = this.autoDeleteEnabled 
      ? 'Se ha activado la eliminación automática de datos antiguos (90 días).'
      : 'Se ha desactivado la limpieza automática.';
    
    // In a real app, save to backend
    console.log(msg);
  }
}
