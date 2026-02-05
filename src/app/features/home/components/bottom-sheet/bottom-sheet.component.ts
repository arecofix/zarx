import { Component, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsItem } from '../../models/home.models';

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
            <p class="text-slate-400 text-[10px] font-mono">
               {{ news.length }} novedades activas
            </p>
          </div>
        </div>
        
        <!-- Chevron -->
        <div class="text-slate-300 transition-transform duration-500" [class.rotate-180]="!collapsed()">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 h-[calc(50vh-4rem)] overflow-y-auto" [class.hidden]="collapsed()">
        
         @for (item of news; track item.id) {
            <div class="mb-4 pb-4 border-b border-white/5 last:border-0 group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-white/10">
                  {{ item.type === 'urgent' ? '🚨' : 'ℹ️' }}
                </div>
                <div class="flex-1">
                   <div class="flex justify-between items-start">
                      <h4 class="text-slate-200 text-sm font-bold group-hover:text-emerald-400 transition-colors">{{ item.text }}</h4>
                      <span class="text-[9px] text-slate-500 font-mono">{{ item.timestamp | date:'HH:mm' }}</span>
                   </div>
                   <p class="text-slate-400 text-xs mt-1 leading-relaxed">Publicado por el centro de control ZARX.</p>
                   <div class="flex items-center gap-2 mt-2">
                       <span class="text-[8px] font-bold px-1 rounded bg-slate-800 border" 
                             [ngClass]="item.type === 'urgent' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                             {{ item.type === 'urgent' ? 'URGENTE' : 'INFO' }}
                       </span>
                   </div>

                    @if (item.isReport) {
                       <button 
                         (click)="onValidateReport(item.id); $event.stopPropagation()"
                         class="mt-3 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                       >
                         🤝 Validación Vecinal
                       </button>
                    }
                 </div>
              </div>
            </div>
         } @empty {
            <div class="text-center py-12 text-slate-500 italic text-sm">
               No hay novedades en este momento.
            </div>
         }

         <button (click)="toggle()" class="w-full py-3 mt-4 text-xs font-mono text-center text-slate-400 hover:text-white border border-dashed border-slate-700 rounded-sm hover:border-slate-500 transition-colors uppercase tracking-widest">
            CERRAR PANEL
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
  @Input() news: NewsItem[] = [];
  @Output() validateReport = new EventEmitter<string>();
  collapsed = signal(true);

  toggle() {
    this.collapsed.update(v => !v);
  }

  onValidateReport(id: string) {
    this.validateReport.emit(id);
  }
}
