import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsItem } from '../../models/home.models';

@Component({
  selector: 'app-news-ticker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Top Bar Container with Glassmorphism -->
    <div class="fixed top-0 left-0 right-0 z-10 h-10 bg-black/80 backdrop-blur-md border-b border-white/5 flex items-center overflow-hidden">
      
      <!-- Static Label -->
      <div class="bg-red-600 h-full px-3 flex items-center justify-center relative z-20 shrink-0">
        <span class="text-white font-black text-xs tracking-widest uppercase animate-pulse">ALERTA</span>
      </div>

      <!-- Marquee Container -->
      <div class="relative flex-1 h-full overflow-hidden flex items-center">
        <div class="whitespace-nowrap animate-marquee flex items-center gap-12 pl-4">
          @for (item of news; track item.id) {
            <span 
              (click)="onNewsClick(item)"
              class="text-xs font-mono tracking-wide cursor-pointer hover:text-white transition-colors flex items-center gap-2"
              [ngClass]="item.type === 'urgent' ? 'text-red-400 font-bold' : 'text-slate-300'">
              
              @if (item.type === 'urgent') {
                <span class="text-[10px] px-1 border border-red-500 rounded-sm">URGENTE</span>
              } @else {
                 <span class="text-[10px] px-1 border border-slate-600 text-slate-500 rounded-sm">INFO</span>
              }
              
              {{ item.text }} &bull; {{ item.timestamp | date:'HH:mm' }}
            </span>
          }
          <!-- Duplicate for seamless loop if needed, but simple CSS animation usually needs content doubling or JS. 
               For now a simple long animation. -->
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-marquee {
      animation: marquee 30s linear infinite;
    }
    
    @keyframes marquee {
      0% { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }

    :host {
      display: block;
    }
  `]
})
export class NewsTickerComponent {
  @Input() news: NewsItem[] = [];
  @Output() newsClicked = new EventEmitter<NewsItem>();

  onNewsClick(item: NewsItem) {
    this.newsClicked.emit(item);
  }
}
