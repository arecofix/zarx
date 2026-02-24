import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CommunityItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  actionUrl?: string;
  colorClass: string;
}

@Component({
  selector: 'app-community-carousel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-0 left-0 right-0 z-30 pb-4 pt-8 bg-linear-to-t from-slate-950 via-slate-900/80 to-transparent pointer-events-none">
       <div class="overflow-x-auto flex gap-4 px-4 snap-x snap-mandatory scrollbar-hide pointer-events-auto">
          
          <!-- Items -->
          @for (item of items(); track item.id) {
             <div (click)="onItemClick(item)" class="snap-center shrink-0 w-64 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl p-3 flex items-center gap-3 shadow-lg hover:border-slate-600 transition-all cursor-pointer active:scale-95">
                <div [class]="'w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-inner ' + item.colorClass">
                   {{ item.icon }}
                </div>
                <div class="flex-1 min-w-0">
                   <h5 class="text-xs font-bold text-slate-200 truncate">{{ item.title }}</h5>
                   <p class="text-[10px] text-slate-400 truncate">{{ item.subtitle }}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-600"><polyline points="9 18 15 12 9 6"></polyline></svg>
             </div>
          }

       </div>
    </div>
  `,
  styles: [`
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
  `]
})
export class CommunityCarouselComponent {
  @Output() itemClick = new EventEmitter<CommunityItem>();

  onItemClick(item: CommunityItem) {
    this.itemClick.emit(item);
  }

  items = signal<CommunityItem[]>([
    { 
      id: '1', 
      title: 'Farmacia de Turno', 
      subtitle: 'San José - Abierto 24hs', 
      icon: '💊', 
      colorClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
    },
    { 
        id: '2', 
        title: 'Reunión Vecinal', 
        subtitle: 'Hoy 18:00hs - Club Social', 
        icon: '🤝', 
        colorClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
    },
    { 
        id: '3', 
        title: 'Alerta Meteorológica', 
        subtitle: 'Lluvias fuertes por la noche', 
        icon: '⛈️', 
        colorClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
    }
  ]);
}
