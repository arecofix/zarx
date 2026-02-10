import { Component, OnInit, inject, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { DashboardService } from '../../../services/dashboard.service'; // Removed in favor of proper ReportService
import { ReportService } from '../../../../../core/services/report.service';
import { REPORT_GROUPS } from '../../../../../core/config/report.config';
import { Report, ReportType } from '../../../../../core/models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-incoming-feed',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="h-full flex flex-col w-full overflow-hidden">
      
      <!-- Header -->
      <div class="p-4 border-b border-slate-700 bg-slate-900/50 backdrop-blur z-10 flex justify-between items-center sticky top-0">
         <h2 class="text-white font-bold tracking-wider flex items-center gap-2 text-sm">
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            🚨 MODERACIÓN EN VIVO
         </h2>
         <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-full font-mono border border-slate-600">
            {{ reportService.liveModerationQueue().length }}
         </span>
      </div>

      <!-- Feed List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
         
         @if (reportService.isLoadingReports()) {
            <div class="flex justify-center p-8">
               <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
         }

         @for (report of reportService.liveModerationQueue(); track report.id) {
            
            <div 
               class="relative bg-slate-800 rounded-xl border-l-4 shadow-lg transition-all hover:bg-slate-750 group"
               [class.border-l-red-500]="isSecurity(report.type)"
               [class.border-l-yellow-500]="!isSecurity(report.type)"
            >
               <!-- Card Body -->
               <div class="p-4">
                  
                  <!-- Top Row: User & Time -->
                  <div class="flex items-start justify-between mb-2">
                     <div class="flex items-center gap-2">
                        <!-- Avatar -->
                        <div class="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                           <img 
                              [src]="report.profiles?.avatar_url || 'assets/images/placeholder_avatar.png'" 
                              class="w-full h-full object-cover" 
                              onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAyNCAyNCcgZmlsbD0ibm9uZScgc3Ryb2tlPSdjdXJyZW50Q29sb3InIHN0cm9rZS13aWR0aD0nMicgc3Ryb2tlLWxpbmVjYXA9J3JvdW5kJyBzdHJva2UtbGluZWpvaW49J3JvdW5kJyBjbGFzcz0idGV4dC1zbGF0ZS01MDAiPjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCIgLz48cGF0aCBkPSJNMjAgMjF2LTIwLTYiIC8+PC9zdmc+'"
                           />
                        </div>
                        <div>
                           <div class="text-white font-bold text-sm leading-tight">
                             {{ report.profiles?.full_name || 'Anónimo' }}
                           </div>
                           <div class="text-slate-400 text-[10px] font-mono">
                             {{ report.created_at | date:'shortTime' }}
                           </div>
                        </div>
                     </div>
                     
                     <!-- Type Badge -->
                     <span 
                        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                        [class.bg-red-900_30]="isSecurity(report.type)"
                        [class.text-red-400]="isSecurity(report.type)"
                        [class.border-red-500_30]="isSecurity(report.type)"
                        [class.bg-yellow-900_30]="!isSecurity(report.type)"
                        [class.text-yellow-400]="!isSecurity(report.type)"
                        [class.border-yellow-500_30]="!isSecurity(report.type)"
                     >
                       {{ report.type }}
                     </span>
                  </div>

                  <!-- Content -->
                  <div class="mt-2 text-slate-300 text-sm mb-3">
                     {{ report.description || 'Sin descripción' }}
                  </div>

                  <!-- Evidence Thumb -->
                  @if (report.evidence_url) {
                     <div class="mb-3 rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video relative group/img cursor-pointer">
                        @if (isVideo(report.evidence_url)) {
                           <video [src]="report.evidence_url" controls class="w-full h-full object-contain"></video>
                        } @else {
                           <img [src]="report.evidence_url" class="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                           <a [href]="report.evidence_url" target="_blank" class="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/40 text-decoration-none">
                              <span class="text-white text-xs font-bold">🔍 Ver Imagen Original</span>
                           </a>
                        }
                     </div>
                  }

                  <!-- Actions -->
                  <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-700/50">
                     
                     <!-- Reject -->
                     <button 
                        (click)="reject(report)"
                        class="flex items-center justify-center gap-2 p-2 bg-slate-900/50 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-all text-xs font-bold"
                     >
                        🚫 RECHAZAR
                     </button>

                     <!-- Validate (Resolve) -->
                     <button 
                        (click)="validate(report)"
                        class="flex items-center justify-center gap-2 p-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 hover:border-emerald-400 rounded-lg text-emerald-400 hover:text-white transition-all text-xs font-bold"
                     >
                        ✅ APROBAR
                     </button>

                  </div>

                  <!-- Secondary Actions (WhatsApp/Map) -->
                  <div class="flex justify-between items-center mt-3 pt-2">
                     <button 
                        (click)="focusMap(report)"
                        class="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold"
                     >
                        📍 Ver en Mapa
                     </button>

                     @if (report.profiles?.phone) {
                        <a 
                           [href]="getWhatsappLink(report.profiles?.phone)" 
                           target="_blank"
                           class="text-[10px] text-green-400 hover:text-green-300 flex items-center gap-1 font-bold"
                        >
                           💬 WhatsApp
                        </a>
                     }
                  </div>

               </div>
            </div>

         } @empty {
            @if (!reportService.isLoadingReports()) {
               <div class="flex flex-col items-center justify-center h-64 text-slate-500 opacity-60">
                  <span class="text-4xl mb-2">✅</span>
                  <p class="text-sm">Todo al día</p>
               </div>
            }
         }
      </div>

    </div>
  `,
  styles: []
})
export class IncomingFeedComponent implements OnInit {
  reportService = inject(ReportService);

  @Output() locateAlert = new EventEmitter<{lat: number, lng: number}>();

  ngOnInit() {
    // Initial fetch of pending reports
    this.reportService.fetchPendingReports();
  }

  isSecurity(type: string | ReportType): boolean {
    return true; // Since this feed is now exclusively for Live Moderation (SOS/Critical), all are security/critical.
  }

  getWhatsappLink(phone?: string): string {
    if (!phone) return '#';
    const cleaned = phone.replace(/\D/g, ''); 
    return `https://wa.me/${cleaned}`;
  }

  focusMap(report: Report) {
    if (report.latitude && report.longitude) {
       this.locateAlert.emit({ lat: report.latitude, lng: report.longitude });
    }
  }

  async validate(report: Report) { 
     if (confirm('¿Confirmas que este reporte es válido y debe publicarse?')) {
        await this.reportService.approveReport(report.id);
     }
  }

  async reject(report: Report) { 
     if (confirm('¿Marcar como Falsa Alarma/Rechazar?')) {
        await this.reportService.rejectReport(report.id);
     }
  }
  isVideo(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
  }
}
