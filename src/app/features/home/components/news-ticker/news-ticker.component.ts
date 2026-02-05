import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsItem } from '../../models/home.models';

@Component({
  selector: 'app-news-ticker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- MAIN CONTAINER -->
    <div class="fixed top-0 left-0 right-0 z-50 flex flex-col font-sans transition-all duration-300 ease-in-out"
         [class.h-auto]="expanded()"
         [class.h-12]="!expanded()"
         [class.bg-slate-900_95]="expanded()"
         [class.backdrop-blur-xl]="expanded()">

      <!-- HEADER / COMPACT VIEW (Marquee) -->
      <div class="h-12 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-700 flex items-center shadow-lg relative z-20 overflow-hidden">
         
         <!-- LEFT: LABEL (Static) -->
         <div (click)="toggleExpand()" class="flex items-center justify-center bg-red-600 h-full px-4 shrink-0 cursor-pointer z-30 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
            <span class="text-white font-black text-[10px] tracking-widest uppercase animate-pulse">
               ALERTA ({{ news.length }})
            </span>
         </div>
         
         <!-- CENTER: MARQUEE -->
         <div (click)="toggleExpand()" class="relative flex-1 h-full overflow-hidden flex items-center cursor-pointer">
            <div class="whitespace-nowrap animate-marquee flex items-center gap-12 pl-4">
               @for (item of news; track item.id) {
                  <span class="text-xs font-bold tracking-wide flex items-center gap-2"
                        [ngClass]="item.type === 'urgent' ? 'text-red-400' : 'text-slate-200'">
                     @if (item.type === 'urgent') {
                        <span class="text-[8px] bg-red-600 text-white px-1 rounded-sm">URGENTE</span>
                     }
                     {{ item.text }} &bull; {{ item.timestamp | date:'HH:mm' }}
                  </span>
               } @empty {
                  <span class="text-xs text-slate-500 italic">No hay alertas activas en el área...</span>
               }
            </div>
         </div>

         <!-- RIGHT: TOGGLE ICON -->
         <div (click)="toggleExpand()" class="px-4 h-full flex items-center text-slate-400 cursor-pointer transition-colors hover:bg-white/5 active:bg-white/10" [class.rotate-180]="expanded()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
         </div>
      </div>

      <!-- EXPANDED LIST (Vertical Scroll) -->
      @if (expanded()) {
        <div class="w-full max-h-[60vh] overflow-y-auto bg-slate-900/95 backdrop-blur-2xl border-b border-slate-700 shadow-2xl animate-slide-down scrollbar-hide">
           @if (news.length === 0) {
              <div class="p-8 text-center text-slate-500 text-xs italic">
                 No hay alertas activas en este momento.
              </div>
           } @else {
              <div class="flex flex-col">
                 <div class="p-3 bg-slate-950/80 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4">Historial Reciente</div>
                 @for (item of news; track item.id) {
                    <div 
                       (click)="onNewsClick(item)"
                       class="p-4 border-b border-slate-800/50 hover:bg-emerald-600/10 active:bg-emerald-600/20 transition-all cursor-pointer flex gap-4 group"
                    >
                       <!-- Icon -->
                       <div class="mt-1 shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/5 group-hover:border-emerald-500/50 transition-colors">
                          {{ item.type === 'urgent' ? '🚨' : '📢' }}
                       </div>
                       
                       <!-- Content -->
                       <div class="flex-1">
                          <div class="flex justify-between items-start mb-1">
                             <div class="flex items-center gap-2">
                                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                   [ngClass]="item.type === 'urgent' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'">
                                   {{ item.type === 'urgent' ? 'URGENTE' : 'INFO' }}
                                </span>
                             </div>
                             <span class="text-[10px] text-slate-500 font-mono">{{ item.timestamp | date:'dd/MM HH:mm' }}</span>
                          </div>
                          
                          <p class="text-sm text-slate-200 font-medium leading-relaxed group-hover:text-white transition-colors">
                             {{ item.text }}
                          </p>
                       </div>
                    </div>
                 }
              </div>
           }
           
           <!-- Close Footer -->
           <div (click)="toggleExpand()" class="p-4 bg-slate-950/80 text-center text-xs text-emerald-500 cursor-pointer hover:bg-slate-900 transition-colors uppercase tracking-[0.2em] font-black">
              Cerrar Detalles
           </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-marquee {
      animation: marquee 40s linear infinite;
    }
    .animate-marquee:hover {
      animation-play-state: paused;
    }
    @keyframes marquee {
      0% { transform: translateX(50%); }
      100% { transform: translateX(-100%); }
    }
    .animate-slide-down {
      animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: top;
    }
    @keyframes slideDown {
      from { transform: scaleY(0.95); opacity: 0; }
      to { transform: scaleY(1); opacity: 1; }
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
  `]
})
// No changes needed here, logic is in HOME
export class NewsTickerComponent {
  @Input() news: NewsItem[] = [];
  @Output() newsClicked = new EventEmitter<NewsItem>();
  
  expanded = signal(false);

  latestAlert = computed(() => {
     if (this.news.length > 0) return this.news[0];
     return null;
  });

  toggleExpand() {
     this.expanded.update(v => !v);
  }

  onNewsClick(item: NewsItem) {
    this.newsClicked.emit(item);
    // Optionally auto-collapse
    // this.expanded.set(false);
  }
}
