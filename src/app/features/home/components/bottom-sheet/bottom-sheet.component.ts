import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-700 transition-all duration-500 ease-out z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]"
      [class.h-16]="collapsed()"
      [class.h-[50vh]]="!collapsed()"
    >
      <!-- Drag Handle / Header -->
      <div 
        (click)="toggle()"
        class="h-16 flex items-center justify-between px-6 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
      >
        <div class="flex items-center gap-3">
          <div class="h-10 w-1 bg-emerald-500 rounded-full glow-bar"></div>
          <div>
            <h3 class="text-white font-bold text-sm tracking-wide">NOVEDADES DE LA RED</h3>
            <p class="text-slate-400 text-[10px] font-mono">Última actualización: Hace 2 min</p>
          </div>
        </div>
        
        <!-- Chevron -->
        <div class="text-slate-500 transition-transform duration-500" [class.rotate-180]="!collapsed()">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        </div>
      </div>

      <!-- Content (Only visible when expanded or scrollable) -->
      <div class="p-6 h-[calc(50vh-4rem)] overflow-y-auto" [class.hidden]="collapsed()">
        
        <!-- Feed Items Placeholders -->
         @for (i of [1,2,3,4,5]; track i) {
           <div class="mb-4 pb-4 border-b border-white/5 last:border-0">
             <div class="flex items-start gap-4">
               <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                 🔔
               </div>
               <div>
                  <h4 class="text-slate-200 text-sm font-medium">Evento Sospechoso reportado</h4>
                  <p class="text-slate-500 text-xs mt-1">Zona Norte, cerca de la estación de tren. Unidades en camino.</p>
                  <span class="text-[10px] text-emerald-500/80 font-mono mt-2 block">ID: #HK-{{9920 + i}} • VERIFIED</span>
               </div>
             </div>
           </div>
         }

         <button class="w-full py-3 mt-4 text-xs font-mono text-center text-slate-400 hover:text-white border border-dashed border-slate-700 rounded-sm hover:border-slate-500 transition-colors">
            CARGAR MÁS HISTORIAL
         </button>

      </div>
    </div>
  `,
  styles: [`
    .glow-bar {
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
    }
  `]
})
export class BottomSheetComponent {
  collapsed = signal(true);

  toggle() {
    this.collapsed.update(v => !v);
  }
}
