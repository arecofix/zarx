import { Component, OnInit, signal, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { ReportService } from '../../../../core/services/report.service';
import { Report } from '../../../../core/models';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report-history',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <div class="h-full w-full bg-slate-950 p-6 flex flex-col text-slate-200 font-mono overflow-hidden">
      
      <!-- Header -->
      <header class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
           <button (click)="goBack()" class="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition-colors border border-slate-700">
             <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
           </button>
           <div>
             <h1 class="text-2xl font-black tracking-widest text-white mb-1">
               <span class="text-blue-500">HISTORIAL</span> DE REPORTES
             </h1>
             <p class="text-xs text-slate-400 uppercase">Registro completo de incidentes y mantenimiento</p>
           </div>
        </div>

        <!-- Filters -->
         <div class="flex gap-2">
            <select [(ngModel)]="statusFilter" (change)="loadReports()" class="bg-slate-900 border border-slate-700 rounded text-xs p-2 text-white focus:border-blue-500 outline-none">
              <option value="">TODOS LOS ESTADOS</option>
              <option value="PENDING">PENDIENTES</option>
              <option value="VALIDATED">VALIDADOS</option>
              <option value="FALSE_ALARM">FALSA ALARMA</option>
              <option value="RESOLVED">RESUELTOS</option>
            </select>
            <button (click)="loadReports()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
              Actualizar
            </button>
         </div>
      </header>
      
      <!-- Table Container -->
      <div class="flex-1 overflow-auto border border-slate-800 rounded-lg bg-slate-900/50">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-900 sticky top-0 z-10 text-xs uppercase tracking-wider text-slate-400 font-bold">
            <tr>
              <th class="p-4 border-b border-slate-700">Fecha/Hora</th>
              <th class="p-4 border-b border-slate-700">Tipo</th>
              <th class="p-4 border-b border-slate-700">Usuario</th>
              <th class="p-4 border-b border-slate-700 text-sm">Descripción</th>
              <th class="p-4 border-b border-slate-700">Ubicación</th>
              <th class="p-4 border-b border-slate-700">Estado</th>
              <th class="p-4 border-b border-slate-700">Evidencia</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-800">
             @if(loading()) {
                <tr>
                   <td colspan="7" class="p-8 text-center text-slate-500">
                      <div class="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                      <p>Cargando registros...</p>
                   </td>
                </tr>
             }

             @for (report of reports(); track report.id) {
                <tr class="hover:bg-slate-800/50 transition-colors group">
                   <td class="p-4 whitespace-nowrap text-slate-400 text-xs">
                      {{ report.created_at | date:'dd/MM/yy HH:mm' }}
                   </td>
                   <td class="p-4">
                      <span class="px-2 py-1 rounded text-[10px] uppercase font-bold border"
                         [ngClass]="getTypeColor(report.type)">
                         {{ report.type }}
                      </span>
                   </td>
                   <td class="p-4 text-slate-300">
                      <div class="flex items-center gap-2">
                        <img [src]="report.profiles?.avatar_url || 'assets/images/placeholder_avatar.png'" class="w-6 h-6 rounded-full bg-slate-800 object-cover border border-slate-700">
                        <span class="font-bold text-xs">{{ report.profiles?.full_name || 'Anónimo' }}</span>
                      </div>
                   </td>
                   <td class="p-4 max-w-xs truncate text-slate-400 font-sans" [title]="report.description">
                      {{ report.description }}
                   </td>
                   <td class="p-4 text-xs font-mono text-slate-500">
                      <a [href]="'https://www.google.com/maps?q=' + report.latitude + ',' + report.longitude" target="_blank" class="hover:text-blue-400 underline decoration-dotted">
                        {{ report.latitude | number:'1.4-4' }}, {{ report.longitude | number:'1.4-4' }}
                      </a>
                   </td>
                   <td class="p-4">
                       <span class="px-2 py-1 rounded-full text-[10px] font-bold"
                          [ngClass]="getStatusColor(report.status)">
                          {{ getStatusLabel(report.status) }}
                       </span>
                   </td>
                   <td class="p-4">
                      @if (report.evidence_url) {
                        <a [href]="report.evidence_url" target="_blank" class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                           Ver
                        </a>
                      } @else {
                        <span class="text-slate-600">-</span>
                      }
                   </td>
                </tr>
             } @empty {
                @if(!loading()) {
                   <tr>
                      <td colspan="7" class="p-12 text-center text-slate-600 italic">
                         No se encontraron reportes.
                      </td>
                   </tr>
                }
             }
          </tbody>
        </table>
      </div>
      
      <!-- Footer / Paginator (Simple) -->
      <div class="mt-4 flex justify-between items-center text-xs text-slate-500 border-t border-slate-800 pt-4">
         <span>Mostrando últimos registros</span>
      </div>

    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; overflow: hidden; height: 100vh; }
  `]
})
export class ReportHistoryComponent implements OnInit {
  private reportService = inject(ReportService);
  private router = inject(Router); // Inject Router
  
  // State
  reports = signal<Report[]>([]);
  loading = signal(true);
  statusFilter = '';

  constructor() {
    // Listen for realtime updates (Vecinal/History Stream)
    effect(() => {
       const newReports = this.reportService.historyLog();
       // Merge only new unique reports to avoid duplication with initial load
       this.reports.update(current => {
          const toAdd = newReports.filter(n => !current.some(c => c.id === n.id));
          return [...toAdd, ...current];
       });
    });
  }

  ngOnInit() {
    this.loadReports();
  }

  async loadReports() {
    this.loading.set(true);
    const filter = this.statusFilter ? { status: this.statusFilter } : undefined;
    const data = await this.reportService.getAllReports(filter);
    // Sort logic handled in DB, but just in case
    this.reports.set(data);
    this.loading.set(false);
  }

  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }

  getTypeColor(type: string | any): string {
    const t = (type || '').toString();
    if (['SOS', 'ROBO', 'RIESGO_VIDA'].includes(t)) return 'border-red-500 text-red-500 bg-red-900/10';
    if (['ACCIDENTE', 'INCENDIO'].includes(t)) return 'border-orange-500 text-orange-500 bg-orange-900/10';
    return 'border-slate-500 text-slate-400 bg-slate-800';
  }

  getStatusColor(status: string): string {
    switch(status) {
       case 'PENDING': return 'bg-yellow-500/20 text-yellow-500';
       case 'VALIDATED': return 'bg-emerald-500/20 text-emerald-500';
       case 'RESOLVED': return 'bg-blue-500/20 text-blue-500';
       case 'FALSE_ALARM': return 'bg-slate-700 text-slate-400 line-through';
       default: return 'bg-slate-800 text-slate-300';
    }
  }

  getStatusLabel(status: string): string {
     return status ? status.replace('_', ' ') : 'UNKNOWN';
  }
}
