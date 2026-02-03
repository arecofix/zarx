import { Component, Output, EventEmitter, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportType } from '../../../../core/models';
import { REPORT_GROUPS } from '../../../../core/config/report.config';

@Component({
  selector: 'app-reports-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:justify-center p-0 sm:p-4">
      
      <!-- Backdrop -->
      <div (click)="close()" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in"></div>

      <!-- Menu Sheet -->
      <div class="relative w-full max-w-sm bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        <!-- Header -->
        <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 z-10 relative">
          <h3 class="text-white font-bold tracking-wide flex items-center gap-2">
            @if (view() === 'MAIN') {
              <span class="text-xl">📢</span> REPORTE
            } @else {
              <button (click)="view.set('MAIN')" class="p-1 -ml-2 mr-1 hover:bg-slate-800 rounded-full text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              @if (view() === 'SECURITY') {
                 🚨 SEGURIDAD
              } @else {
                 🏙️ SERVICIOS
              }
            }
          </h3>
          <button (click)="close()" class="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-4 grid gap-3 max-h-[60vh] overflow-y-auto">

          @if (view() === 'MAIN') {
            <!-- OPTION A: SECURITY -->
            <button (click)="view.set('SECURITY')" class="flex items-center gap-4 p-5 bg-linear-to-br from-red-900/40 to-slate-900 hover:from-red-900/60 border border-red-900/30 hover:border-red-500/50 rounded-2xl transition-all group shadow-lg">
              <div class="w-14 h-14 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div class="text-left">
                <div class="text-white font-black text-lg tracking-tight">SEGURIDAD</div>
                <div class="text-red-300/60 text-xs font-medium uppercase tracking-wider">Prioridad Alta</div>
              </div>
              <div class="ml-auto text-slate-500 group-hover:translate-x-1 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>

            <!-- OPTION B: ZONA / SERVICES -->
            <button (click)="view.set('SERVICE')" class="flex items-center gap-4 p-5 bg-linear-to-br from-blue-900/40 to-slate-900 hover:from-blue-900/60 border border-blue-900/30 hover:border-blue-500/50 rounded-2xl transition-all group shadow-lg">
              <div class="w-14 h-14 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-blue-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M8 21v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </div>
              <div class="text-left">
                <div class="text-white font-black text-lg tracking-tight">ZONA / SERVICIOS</div>
                <div class="text-blue-300/60 text-xs font-medium uppercase tracking-wider">Prioridad Media</div>
              </div>
              <div class="ml-auto text-slate-500 group-hover:translate-x-1 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>

          } @else {
             <!-- SUB LIST ITEMS -->
             
             @for (item of getItems(); track item.type) {
                <button (click)="selectStrict(item.type)" [disabled]="isLoading" class="flex items-center gap-4 p-4 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all group disabled:opacity-50 active:scale-[0.98]">
                   <div class="w-10 h-10 rounded-full bg-slate-900 text-2xl flex items-center justify-center border border-slate-700">
                     {{ item.icon }}
                   </div>
                   <div class="text-left flex-1">
                     <div class="text-slate-200 font-bold">{{ item.label }}</div>
                     <div class="text-slate-500 text-xs">{{ item.description }}</div>
                   </div>
                   <div class="ml-auto text-slate-600">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                   </div>
                </button>
             }

          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  `]
})
export class ReportsMenuComponent {
  @Output() closeMenu = new EventEmitter<void>();
  @Output() selectReport = new EventEmitter<ReportType>();
  @Input() isLoading: boolean = false;

  view = signal<'MAIN' | 'SECURITY' | 'SERVICE'>('MAIN');
  
  // Imports for template
  ReportType = ReportType; 
  REPORT_GROUPS = REPORT_GROUPS;

  getItems() {
    const v = this.view();
    if (v === 'MAIN') return [];
    return this.REPORT_GROUPS[v];
  }

  close() {
    if (!this.isLoading) {
       this.closeMenu.emit();
    }
  }

  selectStrict(type: ReportType) {
    if (this.isLoading) return;
    this.selectReport.emit(type);
  }
}
