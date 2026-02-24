import { Component, Input, Output, EventEmitter, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Report } from '../../../../core/models';

@Component({
  selector: 'app-network-news-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Floating Interaction Layer (Below Critical Bar) -->
    <div class="absolute top-4 left-4 right-4 z-40 flex flex-col items-center pointer-events-none">
       
       <!-- The Pill / Trigger -->
       <div class="pointer-events-auto cursor-pointer" (click)="toggle()">
          @if (!expanded()) {
            <button 
              class="group flex items-center gap-3 bg-slate-900/80 backdrop-blur-md text-slate-200 border border-slate-700/50 shadow-lg rounded-full px-4 py-2 transition-all hover:bg-slate-800 hover:scale-105 active:scale-95 max-w-[90vw]"
            >
               <div class="relative w-2 h-2">
                 <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                 <div class="absolute inset-0 bg-blue-400 rounded-full"></div>
               </div>
               
               <div class="flex flex-col items-start overflow-hidden">
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Novedades de la Red</span>
                  <span class="text-xs font-semibold truncate w-full max-w-[200px]">
                     {{ summaryText() }}
                  </span>
               </div>

               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500 group-hover:text-white transition-colors pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          }
       </div>

       <!-- Expanded Sheet -->
       @if (expanded()) {
          <div class="pointer-events-auto mt-2 w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-down origin-top">
             
             <!-- Header -->
             <div class="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50 sticky top-0 z-50">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Actividad Reciente ({{ reports().length }})</span>
                <button (click)="toggle()" class="p-2 -mr-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors pointer-events-auto">
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
             </div>

             <!-- List -->
             <div class="max-h-[50vh] overflow-y-auto">
                @for (item of reports(); track item.id) {
                   <div (click)="onItemClick(item)" class="p-4 border-b border-slate-800/50 hover:bg-slate-800/50 active:bg-slate-800 transition-colors cursor-pointer group">
                      <div class="flex gap-3">
                         <!-- Icon Placeholder -->
                         <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 group-hover:border-blue-500/50 transition-colors">
                            <span class="text-sm">📌</span>
                         </div>
                         
                         <div class="flex-1">
                            <div class="flex justify-between items-start">
                               <h4 class="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{{ item.type }}</h4>
                               <span class="text-[10px] text-slate-500 font-mono">{{ item.created_at | date:'HH:mm' }}</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-1 line-clamp-2">{{ item.description || 'Sin descripción' }}</p>
                         </div>
                      </div>
                   </div>
                } @empty {
                   <div class="p-8 text-center text-slate-500 text-xs italic">
                      Sin novedades recientes en tu zona.
                   </div>
                }
             </div>
             
             <!-- Footer Action -->
             <div class="p-3 bg-slate-950/80 text-center border-t border-slate-800">
                <button class="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest">
                   Ver Mapa Completo
                </button>
             </div>
          </div>
       }
    </div>
  `,
  styles: [`
    .animate-slide-down {
      animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideDown {
       from { transform: translateY(-10px) scale(0.95); opacity: 0; }
       to { transform: translateY(0) scale(1); opacity: 1; }
    }
  `]
})
export class NetworkNewsSheetComponent {
  reports = input<Report[]>([]);

  @Output() reportClicked = new EventEmitter<Report>();

  expanded = signal(false);

  // Computar el texto de resumen automáticamente basado en la señal de reportes
  summaryText = computed(() => {
     const list = this.reports();
     if (list.length > 0) {
        return `${list.length} reportes: ${list[0].type}...`;
     }
     return 'Sin novedades recientes';
  });

  toggle() {
    this.expanded.update(v => !v);
  }

  onItemClick(item: Report) {
    this.reportClicked.emit(item);
  }
}
