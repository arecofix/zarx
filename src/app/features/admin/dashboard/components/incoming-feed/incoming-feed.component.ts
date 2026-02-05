import { Component, OnInit, OnDestroy, inject, EventEmitter, Output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../services/dashboard.service';
import { REPORT_GROUPS } from '../../../../../core/config/report.config';
import { Alert, ReportType } from '../../../../../core/models';
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
            🚨 ACTIVIDAD EN VIVO
         </h2>
         <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-full font-mono border border-slate-600">{{ dashboardService.incomingAlerts().length }}</span>
      </div>

      <!-- Feed List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
         @for (alert of dashboardService.incomingAlerts(); track alert.id) {
            
            <div 
               class="relative bg-slate-800 rounded-xl border-l-4 shadow-lg transition-all hover:bg-slate-750 group"
               [class.border-l-red-500]="isSecurity(alert.type)"
               [class.border-l-yellow-500]="!isSecurity(alert.type)"
            >
               <!-- Card Body -->
               <div class="p-4">
                  
                  <!-- Top Row: User & Time -->
                  <div class="flex items-start justify-between mb-2">
                     <div class="flex items-center gap-2">
                        <!-- Avatar -->
                        <div class="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                           <img 
                              [src]="alert.profiles?.avatar_url || 'assets/images/placeholder_avatar.png'" 
                              class="w-full h-full object-cover" 
                              onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAyNCAyNCcgZmlsbD0ibm9uZScgc3Ryb2tlPSdjdXJyZW50Q29sb3InIHN0cm9rZS13aWR0aD0nMicgc3Ryb2tlLWxpbmVjYXA9J3JvdW5kJyBzdHJva2UtbGluZWpvaW49J3JvdW5kJyBjbGFzcz0idGV4dC1zbGF0ZS01MDAiPjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCIgLz48cGF0aCBkPSJNMjAgMjF2LTIwLTYiIC8+PC9zdmc+'"
                           />
                        </div>
                        <div>
                           <div class="text-white font-bold text-sm leading-tight">
                             {{ alert.profiles?.full_name || 'Anónimo' }}
                           </div>
                           <div class="text-slate-400 text-[10px] font-mono">
                             {{ alert.created_at | date:'shortTime' }}
                           </div>
                        </div>
                     </div>
                     
                     <!-- Type Badge -->
                     <span 
                        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                        [class.bg-red-900_30]="isSecurity(alert.type)"
                        [class.text-red-400]="isSecurity(alert.type)"
                        [class.border-red-500_30]="isSecurity(alert.type)"
                        [class.bg-yellow-900_30]="!isSecurity(alert.type)"
                        [class.text-yellow-400]="!isSecurity(alert.type)"
                        [class.border-yellow-500_30]="!isSecurity(alert.type)"
                     >
                       {{ alert.type }}
                     </span>
                  </div>

                  <!-- Content -->
                  <div class="mt-2 text-slate-300 text-sm mb-3">
                     {{ alert.description || 'Sin descripción' }}
                  </div>

                  <!-- Evidence Thumb -->
                  @if (alert.evidence_url) {
                     <div class="mb-3 rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video relative group/img cursor-pointer">
                        <img [src]="alert.evidence_url" class="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/40">
                           <span class="text-white text-xs font-bold">🔍 Ampliar</span>
                        </div>
                     </div>
                  }

                  <!-- Actions -->
                  <div class="grid grid-cols-3 gap-2 mt-2">
                     
                     <!-- WhatsApp -->
                     <a 
                        [href]="getWhatsappLink(alert.profiles?.phone)" 
                        [class.pointer-events-none]="!alert.profiles?.phone"
                        [class.opacity-50]="!alert.profiles?.phone"
                        target="_blank"
                        class="flex items-center justify-center gap-1 p-2 bg-slate-700 hover:bg-green-600 rounded text-slate-300 hover:text-white transition-colors text-xs font-bold"
                        title="Contactar por WhatsApp"
                     >
                        WA
                     </a>

                     <!-- Map -->
                     <button 
                        (click)="focusMap(alert)"
                        class="flex items-center justify-center gap-1 p-2 bg-slate-700 hover:bg-blue-600 rounded text-slate-300 hover:text-white transition-colors text-xs font-bold"
                     >
                        📍 MAPA
                     </button>

                     <!-- Actions -->
                     <!-- Reject -->
                     <button 
                        (click)="reject(alert)"
                        class="flex items-center justify-center gap-1 p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-red-400 transition-colors text-xs font-bold"
                        title="Rechazar / Falsa Alarma"
                     >
                        🚫
                     </button>

                     <!-- Validate (Resolve) -->
                     <button 
                        (click)="validate(alert)"
                        class="flex items-center justify-center gap-1 p-2 bg-slate-700 hover:bg-emerald-600 rounded text-slate-300 hover:text-white transition-colors text-xs font-bold col-span-2"
                     >
                        ✅ VALIDAR
                     </button>

                  </div>

               </div>
            </div>

         } @empty {
            <div class="flex flex-col items-center justify-center h-64 text-slate-300">
               <span class="text-4xl mb-2">😴</span>
               <p class="text-sm">Sin alertas pendientes</p>
            </div>
         }
      </div>

    </div>
  `,
  styles: []
})
export class IncomingFeedComponent implements OnInit, OnDestroy {
  dashboardService = inject(DashboardService);

  @Output() locateAlert = new EventEmitter<{lat: number, lng: number}>();

  ngOnInit() {
    this.dashboardService.getAlerts();
    this.dashboardService.subscribeToAlerts();
  }

  ngOnDestroy() {
    this.dashboardService.unsubscribe();
  }

  isSecurity(type: string | ReportType): boolean {
    // Check if it's in security group
    const secTypes = REPORT_GROUPS.SECURITY.map(s => s.type as string);
    // Explicitly check specific values or default
    if (type === 'PANIC' || type === 'SOS') return true;
    return secTypes.includes(type as string);
  }

  getWhatsappLink(phone?: string): string {
    if (!phone) return '#';
    // Basic sanitization
    const cleaned = phone.replace(/\D/g, ''); 
    return `https://wa.me/${cleaned}`;
  }

  focusMap(alert: Alert) {
    if (alert.latitude && alert.longitude) {
       this.locateAlert.emit({ lat: alert.latitude, lng: alert.longitude });
    }
  }

  processAlert(alert: Alert, status: 'RESOLVED' | 'FALSE_ALARM' | 'ENGAGED') {
     let feedback: string | null = null;
     
     // Ask for feedback only for final states
     if (status !== 'ENGAGED') {
       if (!confirm(`¿Confirmas ${status === 'RESOLVED' ? 'VALIDAR' : 'RECHAZAR'} esta alerta?`)) return;
       
       // Simple interaction for MVP (Can be replaced by Modal later)
       const userMsg = prompt("Mensaje para el vecino (Opcional):", "");
       if (userMsg !== null) { // If not cancelled
          feedback = userMsg;
       } else {
          return; // Cancelled
       }
     }
     
     this.dashboardService.verifyAlert(alert.id!, status, feedback || undefined);
  }

  // Aliases for Template
  validate(alert: Alert) { this.processAlert(alert, 'RESOLVED'); }
  reject(alert: Alert) { this.processAlert(alert, 'FALSE_ALARM'); }
}
