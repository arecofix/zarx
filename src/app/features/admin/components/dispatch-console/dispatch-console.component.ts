import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AudioService } from '../../../../core/services/audio.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Alert } from '../../../../core/models';
import { AlertService } from '../../../../core/services/alert.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { MessagingService } from '../../../../core/services/messaging.service';
import { FormsModule } from '@angular/forms';
import { Profile } from '../../../../core/models';

import { AdminHeatmapComponent } from '../admin-heatmap/admin-heatmap.component';

@Component({
  selector: 'app-dispatch-console',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminHeatmapComponent],
  template: `
    <div class="min-h-screen bg-slate-950 text-white">
      <!-- Header -->
      <header class="bg-slate-900 border-b border-slate-800 p-3 md:p-4">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 md:gap-4">
          <div class="flex items-center gap-2 md:gap-4">
            <button 
              (click)="goBack()"
              class="text-slate-400 hover:text-white transition-colors"
            >
              <svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 class="text-lg md:text-2xl font-bold">🚨 Consola de Despacho</h1>
          </div>

          <!-- Monitoring Toggle -->
          <div class="flex items-center gap-4">
            @if (!isMonitoring()) {
              <button
                (click)="activateMonitoring()"
                class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold transition-all active:scale-95 flex items-center gap-2"
              >
                <span>🎧</span> Activar Monitoreo
              </button>
            } @else {
              <div class="flex items-center gap-3">
                <button
                  (click)="toggleScoreFilter()"
                  class="px-4 py-2 border rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                  [class.bg-emerald-600]="minScoreFilter() > 0"
                  [class.border-emerald-500]="minScoreFilter() > 0"
                  [class.text-white]="minScoreFilter() > 0"
                  [class.bg-slate-800]="minScoreFilter() === 0"
                  [class.border-slate-600]="minScoreFilter() === 0"
                  [class.text-slate-400]="minScoreFilter() === 0"
                  title="Filtrar usuarios poco confiables"
                >
                  <span class="text-lg">🛡️</span>
                  {{ minScoreFilter() > 0 ? 'Filtro Activo (>200)' : 'Sin Filtro' }}
                </button>

                <div class="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 border border-emerald-500/50 rounded-lg">
                  <div class="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span class="text-sm font-bold text-emerald-400">MONITOREO ACTIVO</span>
                </div>
                
                <button
                  (click)="testAudio()"
                  class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors"
                  title="Probar audio"
                >
                  🔊 Test
                </button>

                <button
                  (click)="deactivateMonitoring()"
                  class="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/50 rounded-lg text-sm font-bold transition-colors"
                >
                  Detener
                </button>
              </div>
            }
          </div>
        </div>
        
        <!-- Tabs Navigation -->
        <div class="max-w-7xl mx-auto flex gap-6 px-4 -mb-px">
           <button 
             (click)="currentTab.set('LIST')"
             class="pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2"
             [class.border-emerald-500]="currentTab() === 'LIST'"
             [class.text-emerald-400]="currentTab() === 'LIST'"
             [class.border-transparent]="currentTab() !== 'LIST'"
             [class.text-slate-400]="currentTab() !== 'LIST'"
           >
             <span>📋</span> LISTADO EN VIVO
           </button>
           <button 
             (click)="currentTab.set('MAP')"
             class="pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2"
             [class.border-emerald-500]="currentTab() === 'MAP'"
             [class.text-emerald-400]="currentTab() === 'MAP'"
             [class.border-transparent]="currentTab() !== 'MAP'"
             [class.text-slate-400]="currentTab() !== 'MAP'"
           >
             <span>🗺️</span> MAPA TÁCTICO
           </button>
        </div>

          <!-- Broadcast Button -->
          <button (click)="openBroadcastModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold flex items-center gap-2">
             <span>📢</span> COMUNICAR
          </button>
      </header>

      <!-- Stats Bar -->
      <div class="bg-slate-900/50 border-b border-slate-800 p-4">
        <div class="max-w-7xl mx-auto grid grid-cols-4 gap-4">
          <div class="bg-slate-800 rounded-lg p-4">
            <div class="text-3xl font-bold text-white">{{ stats().total }}</div>
            <div class="text-sm text-slate-400">Total Alertas</div>
          </div>
          <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div class="text-3xl font-bold text-red-400">{{ stats().critical }}</div>
            <div class="text-sm text-slate-400">Críticas</div>
          </div>
          <div class="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
            <div class="text-3xl font-bold text-orange-400">{{ stats().high }}</div>
            <div class="text-sm text-slate-400">Alta Prioridad</div>
          </div>
          <div class="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
            <div class="text-3xl font-bold text-emerald-400">{{ stats().resolved }}</div>
            <div class="text-sm text-slate-400">Resueltas</div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <main class="max-w-7xl mx-auto p-6 h-[calc(100vh-250px)]">
      
        @if (currentTab() === 'MAP') {
           <app-admin-heatmap></app-admin-heatmap>
        } @else {
           <!-- Alerts List -->
           <div class="space-y-4 h-full overflow-y-auto pr-2">
          @if (isLoading()) {
            <div class="text-center py-12">
              <div class="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p class="mt-4 text-slate-400">Cargando alertas...</p>
            </div>
          } @else if (alerts().length === 0) {
            <div class="text-center py-12">
              <div class="text-6xl mb-4">✅</div>
              <p class="text-xl text-slate-400">No hay alertas activas</p>
            </div>
          } @else {
            @for (alert of alerts(); track alert.id) {
              <div 
                class="bg-slate-900 border rounded-xl p-6 transition-all hover:border-slate-600"
                [class.border-red-500]="alert.priority === 'CRITICAL' || alert.type === 'RIESGO_VIDA'"
                [class.bg-red-950_20]="alert.type === 'RIESGO_VIDA'"
                [class.border-orange-500]="alert.priority === 'HIGH'"
                [class.border-yellow-500]="alert.priority === 'MEDIUM'"
                [class.border-slate-700]="alert.priority === 'LOW'"
              >
                <div class="flex items-start justify-between">
                  <!-- Alert Info -->
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-3">
                      <!-- Priority Badge -->
                      <span 
                        class="px-3 py-1 rounded-full text-xs font-bold"
                        [class.bg-red-500]="alert.priority === 'CRITICAL'"
                        [class.bg-orange-500]="alert.priority === 'HIGH'"
                        [class.bg-yellow-500]="alert.priority === 'MEDIUM'"
                        [class.bg-slate-600]="alert.priority === 'LOW'"
                      >
                        {{ alert.priority }}
                      </span>

                      <!-- Type -->
                      <span class="text-lg font-bold">{{ alert.type }}</span>

                      <!-- Status -->
                      <span 
                        class="px-2 py-1 rounded text-xs font-bold"
                        [class.bg-emerald-900/30]="alert.status === 'OPEN'"
                        [class.bg-blue-900/30]="alert.status === 'ENGAGED'"
                        [class.bg-slate-900/30]="alert.status === 'RESOLVED'"
                        [class.text-emerald-400]="alert.status === 'OPEN'"
                        [class.text-blue-400]="alert.status === 'ENGAGED'"
                        [class.text-slate-400]="alert.status === 'RESOLVED'"
                      >
                        {{ alert.status }}
                      </span>

                      <!-- Reporter Name -->
                      @if (alert.profiles?.username) {
                        <span class="text-xs text-slate-500 font-mono">@{{ alert.profiles?.username }}</span>
                      }

                      <!-- Panic Badge -->
                      @if (alert.is_panic) {
                        <span class="px-2 py-1 bg-red-600 rounded text-xs font-bold animate-pulse">
                          🚨 PÁNICO
                        </span>
                      }
                    </div>

                    <!-- Description -->
                    @if (alert.description) {
                      <p class="text-slate-300 mb-2">{{ alert.description }}</p>
                    }

                    <!-- Location -->
                    @if (alert.address) {
                      <p class="text-sm text-slate-400 flex items-center gap-2">
                        <span>📍</span> {{ alert.address }}
                      </p>
                    } @else if (alert.latitude && alert.longitude) {
                      <p class="text-sm text-slate-400 flex items-center gap-2">
                        <span>📍</span> {{ alert.latitude.toFixed(6) }}, {{ alert.longitude.toFixed(6) }}
                      </p>
                    }

                    <!-- Timestamp -->
                    <p class="text-xs text-slate-500 mt-2">
                      {{ formatTimestamp(alert.created_at) }}
                    </p>
                  </div>

                  <!-- Actions -->
                  <div class="flex flex-col gap-2 ml-6">
                    @if (alert.status === 'OPEN') {
                      <button
                        (click)="confirmAlert(alert)"
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-bold transition-all active:scale-95"
                      >
                        ✓ Confirmar
                      </button>
                      
                      <button
                        (click)="notifyPolice(alert)"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold transition-all active:scale-95"
                      >
                        🚔 Avisar Policía
                      </button>
                      
                      <button
                        (click)="markFalseAlarm(alert)"
                        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold transition-all active:scale-95"
                      >
                        ✗ Falsa Alarma
                      </button>
                    } @else if (alert.status === 'ENGAGED') {
                      <button
                        (click)="resolveAlert(alert)"
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-bold transition-all active:scale-95"
                      >
                        ✓ Resolver
                      </button>
                    } @else if (alert.status === 'VALIDATED') {
                       <button
                        (click)="updateAlertStatusLocal(alert.id!, 'ENGAGED')"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold transition-all active:scale-95"
                      >
                        🚔 Despachar
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          }
        </div>
        }
      </main>

      <!-- Broadcast Modal -->
      @if (showBroadcastModal()) {
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
           <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
              <button (click)="closeBroadcastModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
              
              <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                 <span>📢</span> Nueva Transmisión
              </h2>

              <div class="space-y-4">
                 <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">TÍTULO</label>
                    <input [(ngModel)]="broadcastTitle" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" placeholder="Ej: ALERTA METEOROLÓGICA">
                 </div>

                 <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">MENSAJE</label>
                    <textarea [(ngModel)]="broadcastBody" rows="4" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" placeholder="Escriba el mensaje para la comunidad..."></textarea>
                 </div>

                 <div>
                    <label class="block text-xs font-bold text-slate-400 mb-1">PRIORIDAD</label>
                    <div class="flex gap-2">
                       <button (click)="broadcastType = 'INFO'" [class.bg-blue-600]="broadcastType === 'INFO'" [class.bg-slate-800]="broadcastType !== 'INFO'" class="flex-1 py-2 rounded text-xs font-bold transition-colors">INFORMATIVO</button>
                       <button (click)="broadcastType = 'ALERT'" [class.bg-red-600]="broadcastType === 'ALERT'" [class.bg-slate-800]="broadcastType !== 'ALERT'" class="flex-1 py-2 rounded text-xs font-bold transition-colors">ALERTA ROJA</button>
                    </div>
                 </div>

                 <button (click)="sendBroadcast()" [disabled]="isSendingBroadcast()" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded font-bold mt-4 flex justify-center items-center gap-2">
                    @if(isSendingBroadcast()) {
                       <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    }
                    ENVIAR A TODOS
                 </button>
              </div>
           </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class DispatchConsoleComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService).client;
  private audioService = inject(AudioService);
  private toastService = inject(ToastService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private location = inject(Location);
  private messaging = inject(MessagingService);

  // Signals
  rawAlerts = signal<Alert[]>([]);
  minScoreFilter = signal(200); // Filter threshold
  currentTab = signal<'LIST' | 'MAP'>('LIST');
  
  // Computed
  alerts = computed(() => {
     return this.rawAlerts().filter(a => (a.profiles?.reputation_score || 0) >= this.minScoreFilter());
  });

  isLoading = signal(true);
  isMonitoring = signal(false);
  
  // Broadcast State
  showBroadcastModal = signal(false);
  isSendingBroadcast = signal(false);
  broadcastTitle = '';
  broadcastBody = '';
  broadcastType: 'INFO' | 'ALERT' = 'INFO';

  // Computed
  stats = computed(() => {
    const all = this.alerts();
    return {
      total: all.length,
      critical: all.filter(a => a.priority === 'CRITICAL').length,
      high: all.filter(a => a.priority === 'HIGH').length,
      resolved: all.filter(a => a.status === 'RESOLVED').length
    };
  });

  private realtimeChannel: RealtimeChannel | null = null;

  async ngOnInit() {
    await this.loadAlerts();
    this.setupRealtime();
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
    this.audioService.deactivateMonitoring();
  }

  async loadAlerts() {
    this.isLoading.set(true);

    try {
      const { data, error } = await this.supabase
        .from('reports')
        .select('*, profiles:user_id(id, full_name, avatar_url, phone, username, role)')
        .in('status', ['PENDING', 'VALIDATED', 'ENGAGED', 'OPEN'])
        .order('created_at', { ascending: false});

      if (error) throw error;

      this.rawAlerts.set((data as Alert[]) || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      this.toastService.error('Error al cargar alertas');
    } finally {
      this.isLoading.set(false);
    }
  }

  setupRealtime() {
    this.realtimeChannel = this.supabase
      .channel('dispatch-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports'
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          this.handleNewAlert(newAlert);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports'
        },
        (payload) => {
          this.handleAlertUpdate(payload.new as Alert);
        }
      )
      .subscribe();
  }

  handleNewAlert(alert: Alert) {
    // Add to list
    this.rawAlerts.update(list => [alert, ...list]);

    // Play sound if monitoring is active
    if (this.isMonitoring()) {
      if (alert.type === 'RIESGO_VIDA') {
        this.playEmergencySiren();
      } else {
        this.audioService.playAlertSound(alert.priority || 'MEDIUM');
      }
    }

    // Show toast
    this.toastService.warning(`Nueva alerta: ${alert.type}`, 5000);
  }

  private playEmergencySiren() {
    // RIESGO_VIDA pattern: Siren with more urgency
    const siren = new Audio('assets/sounds/siren.mp3');
    siren.loop = true;
    siren.play().catch(e => console.warn('Emergency siren failed:', e));
    
    // Stop after some time or when resolved? For now let's just trigger it.
    setTimeout(() => {
      siren.pause();
    }, 15000);
  }

  handleAlertUpdate(alert: Alert) {
    this.rawAlerts.update(list => 
      list.map(a => a.id === alert.id ? alert : a)
        .filter(a => ['OPEN', 'ENGAGED', 'VALIDATED'].includes(a.status))
    );
  }

  toggleScoreFilter() {
    this.minScoreFilter.update(v => v === 0 ? 200 : 0);
  }

  activateMonitoring() {
    const success = this.audioService.activateMonitoring();
    if (success) {
      this.isMonitoring.set(true);
      this.toastService.success('Monitoreo activado - Audio habilitado');
    }
  }

  deactivateMonitoring() {
    this.audioService.deactivateMonitoring();
    this.isMonitoring.set(false);
    this.toastService.info('Monitoreo desactivado');
  }

  testAudio() {
    this.audioService.testAudio();
  }

  async confirmAlert(alert: Alert) {
    // Optimistic UI
    const originalStatus = alert.status;
    this.handleAlertUpdate({ ...alert, status: 'VALIDATED' });

    const success = await this.alertService.updateAlertStatus({
      id: alert.id!,
      status: 'VALIDATED',
      userId: alert.user_id
    });
    
    if (success) {
      this.toastService.success('Alerta validada y usuario notificado');
    } else {
      // Revert
      this.handleAlertUpdate({ ...alert, status: originalStatus });
    }
  }

  async notifyPolice(alert: Alert) {
    // TODO: Implement actual police notification
    await this.updateAlertStatusLocal(alert.id!, 'ENGAGED');
    this.toastService.success('Policía notificada');
  }

  async markFalseAlarm(alert: Alert) {
     // Optimistic UI
    const originalStatus = alert.status;
    this.handleAlertUpdate({ ...alert, status: 'FALSE_ALARM' });

    const success = await this.alertService.updateAlertStatus({
      id: alert.id!,
      status: 'FALSE_ALARM',
      userId: alert.user_id
    });

    if (success) {
      this.toastService.info('Marcada como falsa alarma');
    } else {
      // Revert
      this.handleAlertUpdate({ ...alert, status: originalStatus });
    }
  }

  async resolveAlert(alert: Alert) {
    // Optimistic UI
    const originalStatus = alert.status;
    this.handleAlertUpdate({ ...alert, status: 'RESOLVED' });

    const success = await this.alertService.updateAlertStatus({
      id: alert.id!,
      status: 'RESOLVED',
      userId: alert.user_id
    });

    if (success) {
      this.toastService.success('Alerta resuelta');
    } else {
      // Revert
      this.handleAlertUpdate({ ...alert, status: originalStatus });
    }
  }

  async updateAlertStatusLocal(id: string, status: Alert['status']) {
    // Find alert for optimistic update
    const alert = this.rawAlerts().find(a => a.id === id);
    if (!alert) return;

    const originalStatus = alert.status;
    this.handleAlertUpdate({ ...alert, status });

    const success = await this.alertService.updateAlertStatus({ id, status });
    
    if (success) {
      this.toastService.success(`Estado actualizado a ${status}`);
    } else {
       this.handleAlertUpdate({ ...alert, status: originalStatus });
    }
  }

  formatTimestamp(timestamp?: string): string {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    
    return date.toLocaleString('es-AR');
  }

  goBack() {
    this.location.back();
  }

  openBroadcastModal() {
     this.showBroadcastModal.set(true);
  }

  closeBroadcastModal() {
     this.showBroadcastModal.set(false);
  }

  async sendBroadcast() {
     if (!this.broadcastTitle || !this.broadcastBody) return;
     
     this.isSendingBroadcast.set(true);
     try {
       await this.messaging.sendBroadcast({
         title: this.broadcastTitle,
         body: this.broadcastBody,
         type: this.broadcastType
       });
       
       this.toastService.success('Mensaje enviado a la comunidad');
       this.closeBroadcastModal();
       this.broadcastTitle = '';
       this.broadcastBody = '';
     } catch (e) {
       console.error(e);
       this.toastService.error('Error al enviar mensaje');
     } finally {
       this.isSendingBroadcast.set(false);
     }
  }
}
