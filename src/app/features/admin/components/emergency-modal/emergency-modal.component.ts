import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Emergency } from '../../../../core/services/monitoring.service';

@Component({
  selector: 'app-emergency-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      
      <!-- Modal Card -->
      <div class="bg-slate-900 border-2 border-red-600 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden relative animate-in zoom-in-95 duration-300">
        
        <!-- Header -->
        <div class="bg-red-600 p-4 flex justify-between items-center">
          <h2 class="text-white font-black text-xl tracking-wider flex items-center gap-2">
            <span class="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            ALERTA SOS ACTIVA
          </h2>
          <button (click)="close.emit()" class="text-white/80 hover:text-white">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6">
          
          <!-- Victim Info -->
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-full bg-slate-800 border-2 border-red-500 overflow-hidden shrink-0">
               <img [src]="emergency.profile?.avatar_url || 'assets/images/placeholder_avatar.png'" class="w-full h-full object-cover">
            </div>
            <div>
               <h3 class="text-2xl font-bold text-white">{{ emergency.profile?.full_name || 'Usuario Desconocido' }}</h3>
               <p class="text-red-400 font-mono text-sm">ID: {{ emergency.user_id.substring(0,8) }}</p>
               <div class="flex gap-2 mt-2">
                 <a [href]="'tel:' + emergency.profile?.phone" class="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded flex items-center gap-1">
                    📞 Llamar
                 </a>
                 <a *ngIf="emergency.profile?.phone" [href]="getWhatsappLink(emergency.profile?.phone)" target="_blank" class="px-3 py-1 bg-green-500 hover:bg-green-400 text-white text-xs font-bold rounded flex items-center gap-1">
                    💬 WhatsApp
                 </a>
               </div>
            </div>
          </div>

          <!-- Location Info -->
          <div class="bg-slate-800 p-4 rounded-lg border border-slate-700">
             <div class="flex justify-between items-center mb-2">
               <span class="text-slate-400 text-xs uppercase font-bold">Ubicación Actual</span>
               <span class="text-red-500 text-xs font-mono animate-pulse">LIVE TRACKING</span>
             </div>
             <p class="text-white font-mono text-lg">{{ emergency.latitude | number:'1.5-5' }}, {{ emergency.longitude | number:'1.5-5' }}</p>
             <div class="mt-3">
               <a [href]="'https://www.google.com/maps?q=' + emergency.latitude + ',' + emergency.longitude" target="_blank" class="block w-full text-center py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded uppercase text-xs">
                 📍 Ver en Google Maps
               </a>
             </div>
          </div>

        </div>

        <!-- Actions -->
        <div class="p-4 bg-slate-800 border-t border-slate-700 grid grid-cols-2 gap-4">
           <button (click)="resolve.emit()" class="col-span-2 py-3 bg-slate-700 hover:bg-emerald-600 text-white font-bold rounded uppercase tracking-widest transition-colors">
              MARCAR COMO RESUELTO
           </button>
        </div>

      </div>
    </div>
  `
})
export class EmergencyModalComponent {
  @Input({ required: true }) emergency!: Emergency;
  @Output() close = new EventEmitter<void>();
  @Output() resolve = new EventEmitter<void>();

  getWhatsappLink(phone?: string): string {
    if (!phone) return '#';
    const cleaned = phone.replace(/\D/g, ''); 
    return `https://wa.me/${cleaned}`;
  }
}
