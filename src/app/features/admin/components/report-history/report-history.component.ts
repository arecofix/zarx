import { Component, OnInit, signal, inject } from '@angular/core';
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
      <header class="flex flex-col gap-4 mb-6">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
            <button (click)="goBack()" class="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition-colors border border-slate-700">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            <div>
                <h1 class="text-2xl font-black tracking-widest text-white mb-1">
                <span class="text-blue-500">HISTORIAL</span> DE REPORTES
                </h1>
                <p class="text-xs text-slate-400 uppercase">Registro completo y auditoría</p>
            </div>
            </div>

            <!-- Global Actions -->
            <div class="flex gap-2">
                <button (click)="loadReports()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded text-xs flex items-center gap-2 border border-slate-700 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                REFRESCAR
                </button>
            </div>
        </div>

        <!-- Toolbar: Filters & Categories -->
        <div class="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            
            <!-- Tabs -->
            <div class="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button 
                    (click)="setCategory('ALL')" 
                    class="px-4 py-1.5 rounded-md text-xs font-bold transition-all"
                    [class.bg-slate-800]="categoryFilter === 'ALL'"
                    [class.text-white]="categoryFilter === 'ALL'"
                    [class.text-slate-500]="categoryFilter !== 'ALL'"
                    [class.shadow]="categoryFilter === 'ALL'"
                >TODOS</button>
                <button 
                    (click)="setCategory('SECURITY')" 
                    class="px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2"
                    [class.bg-red-900_20]="categoryFilter === 'SECURITY'"
                    [class.bg-slate-800]="categoryFilter === 'SECURITY'"
                    [class.text-red-400]="categoryFilter === 'SECURITY'"
                    [class.text-slate-500]="categoryFilter !== 'SECURITY'"
                    [class.shadow]="categoryFilter === 'SECURITY'"
                >
                    🚨 SEGURIDAD
                </button>
                <button 
                    (click)="setCategory('SERVICE')" 
                    class="px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2"
                    [class.bg-blue-900_20]="categoryFilter === 'SERVICE'"
                    [class.bg-slate-800]="categoryFilter === 'SERVICE'"
                    [class.text-blue-400]="categoryFilter === 'SERVICE'"
                    [class.text-slate-500]="categoryFilter !== 'SERVICE'"
                    [class.shadow]="categoryFilter === 'SERVICE'"
                >
                    🛠️ VECINAL
                </button>
            </div>

            <!-- Status Filter -->
            <select [(ngModel)]="statusFilter" (change)="loadReports()" class="bg-slate-950 border border-slate-700 rounded text-xs p-2 text-white focus:border-blue-500 outline-none min-w-[150px]">
              <option value="">ESTADO: TODOS</option>
              <option value="PENDING">⚪ PENDIENTES</option>
              <option value="VALIDATED">🟢 VALIDADOS / ACTIVOS</option>
              <option value="RESOLVED">🔵 RESUELTOS</option>
              <option value="FALSE_ALARM">🚫 FALSA ALARMA</option>
            </select>
        </div>
      </header>
      
      <!-- Table Container -->
      <div class="flex-1 overflow-auto border border-slate-800 rounded-lg bg-slate-900/50">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-900 sticky top-0 z-10 text-xs uppercase tracking-wider text-slate-400 font-bold">
            <tr>
              <th class="p-4 border-b border-slate-700">Fecha</th>
              <th class="p-4 border-b border-slate-700">Categoría</th>
              <th class="p-4 border-b border-slate-700">Usuario</th>
              <th class="p-4 border-b border-slate-700 w-1/4">Detalle</th>
              <th class="p-4 border-b border-slate-700">Estado</th>
              <th class="p-4 border-b border-slate-700 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-800">
             @if(loading()) {
                <tr>
                   <td colspan="6" class="p-12 text-center text-slate-500">
                      <div class="animate-spin inline-block w-8 h-8 border-2 border-slate-600 border-t-white rounded-full mb-3"></div>
                      <p class="animate-pulse text-xs">Sincronizando registros...</p>
                   </td>
                </tr>
             }

             @for (report of reports(); track report.id) {
                <tr class="hover:bg-slate-800/50 transition-colors group border-l-2 border-l-transparent hover:border-l-blue-500">
                   <td class="p-4 whitespace-nowrap text-slate-400 text-xs font-mono">
                      {{ report.created_at | date:'dd MMM HH:mm' }}
                   </td>
                   <td class="p-4">
                      <span class="px-2 py-1 rounded text-[10px] uppercase font-bold border inline-flex items-center gap-1"
                         [ngClass]="getTypeColor(report.type)">
                         {{ report.type }}
                      </span>
                   </td>
                   <td class="p-4 text-slate-300">
                      <div class="flex items-center gap-2">
                        <img 
                            [src]="report.profiles?.avatar_url || 'assets/images/placeholder_avatar.png'" 
                            class="w-6 h-6 rounded-full bg-slate-800 object-cover border border-slate-700"
                            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAyNCAyNCcgZmlsbD0ibm9uZScgc3Ryb2tlPSdjdXJyZW50Q29sb3InIHN0cm9rZS13aWR0aD0nMicgc3Ryb2tlLWxpbmVjYXA9J3JvdW5kJyBzdHJva2UtbGluZWpvaW49J3JvdW5kJyBjbGFzcz0idGV4dC1zbGF0ZS01MDAiPjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCIgLz48cGF0aCBkPSJNMjAgMjF2LTIwLTYiIC8+PC9zdmc+'"
                        >
                        <div class="flex flex-col">
                            <span class="font-bold text-xs leading-tight">{{ report.profiles?.full_name || 'Anónimo' }}</span>
                            <span class="text-[10px] text-slate-500">{{ report.profiles?.phone || 'Sin télefono' }}</span>
                        </div>
                      </div>
                   </td>
                   <td class="p-4">
                      <div class="text-xs text-slate-300 font-medium truncate max-w-[200px]" [title]="report.description">
                         {{ report.description || 'Sin descripción' }}
                      </div>
                      <div class="text-[10px] text-slate-500 flex gap-2 mt-1 font-mono">
                         <span>📍 {{ report.latitude | number:'1.4-4' }}, {{ report.longitude | number:'1.4-4' }}</span>
                      </div>
                   </td>
                   <td class="p-4">
                       <span class="px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1"
                          [ngClass]="getStatusColor(report.status)">
                          <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {{ getStatusLabel(report.status) }}
                       </span>
                   </td>
                   <td class="p-4 text-right">
                      <div class="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        @if (report.evidence_url) {
                            <a [href]="report.evidence_url" target="_blank" class="p-1.5 hover:bg-slate-700 rounded text-blue-400" title="Ver Evidencia">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </a>
                        }
                        @if (report.latitude && report.longitude) {
                            <a [href]="'https://www.google.com/maps?q=' + report.latitude + ',' + report.longitude" target="_blank" class="p-1.5 hover:bg-slate-700 rounded text-emerald-400" title="Abrir Mapa">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            </a>
                        }
                      </div>
                   </td>
                </tr>
             } @empty {
                @if(!loading()) {
                   <tr>
                      <td colspan="6" class="p-12 text-center text-slate-600 italic border-t border-slate-800">
                         <div class="mb-2 text-2xl opacity-20">📭</div>
                         No se encontraron reportes con los filtros actuales.
                      </td>
                   </tr>
                }
             }
          </tbody>
        </table>
      </div>
      
      <!-- Footer / Paginator (Simple) -->
      <div class="mt-4 flex justify-between items-center text-xs text-slate-500 border-t border-slate-800 pt-4">
         <span>{{ reports().length }} registros cargados</span>
         <div class="flex gap-2">
             <!-- Simple Pagination if needed later -->
         </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; overflow: hidden; height: 100dvh; }
  `]
})
export class ReportHistoryComponent implements OnInit {
  private reportService = inject(ReportService);
  private router = inject(Router);
  
  // State
  reports = signal<Report[]>([]);
  loading = signal(true);
  
  // Filters
  statusFilter = '';
  categoryFilter: 'ALL' | 'SECURITY' | 'SERVICE' = 'ALL';

  constructor() {
    // Audit/History mode prefers explicit refresh over live stream merging which can get complex with filters
  }

  ngOnInit() {
    this.loadReports();
  }

  setCategory(cat: 'ALL' | 'SECURITY' | 'SERVICE') {
      this.categoryFilter = cat;
      this.loadReports();
  }

  async loadReports() {
    this.loading.set(true);
    
    // Build Filter Object
    const filter: any = {};
    if (this.statusFilter) filter.status = this.statusFilter;
    if (this.categoryFilter !== 'ALL') filter.category = this.categoryFilter;

    const data = await this.reportService.getAllReports(filter);
    
    this.reports.set(data);
    this.loading.set(false);
  }

  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }

  getTypeColor(type: string | any): string {
    const t = (type || '').toString();
    if (['SOS', 'ROBO', 'RIESGO_VIDA', 'PANIC', 'DELITO_PROCESO'].includes(t)) return 'border-red-500/50 text-red-400 bg-red-900/20';
    if (['ACCIDENTE', 'INCENDIO', 'EMERGENCIA_MEDICA'].includes(t)) return 'border-orange-500/50 text-orange-400 bg-orange-900/20';
    return 'border-slate-600 text-slate-400 bg-slate-800/50';
  }

  getStatusColor(status: string): string {
    switch(status) {
       case 'PENDING': return 'text-yellow-500 bg-yellow-500/10';
       case 'VALIDATED': return 'text-emerald-400 bg-emerald-500/10';
       case 'OPEN': return 'text-emerald-400 bg-emerald-500/10';
       case 'ENGAGED': return 'text-purple-400 bg-purple-500/10';
       case 'RESOLVED': return 'text-blue-400 bg-blue-500/10';
       case 'FALSE_ALARM': return 'text-slate-500 line-through decoration-slate-600';
       default: return 'text-slate-400';
    }
  }

  getStatusLabel(status: string): string {
     if (!status) return 'UNKNOWN';
     const map: any = {
         'PENDING': 'PENDIENTE',
         'VALIDATED': 'ACTIVO/VALIDADO',
         'OPEN': 'ABIERTO',
         'ENGAGED': 'EN PROCESO',
         'RESOLVED': 'RESUELTO',
         'FALSE_ALARM': 'FALSA ALARMA'
     };
     return map[status] || status;
  }
}
