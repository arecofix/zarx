import { Component, OnDestroy, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { ZarxIdentity } from '../../../../core/services/identity.service';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex flex-col items-center" [class.bg-transparent]="true">
      
      <!-- HEADER OVERLAY -->
      <div class="w-full bg-slate-900/90 p-4 pt-12 flex justify-between items-center z-10">
         <h2 class="text-white font-bold text-lg tracking-wider">MODO ESCÁNER</h2>
         <button (click)="stopScan()" class="text-white bg-slate-800 px-4 py-2 rounded font-bold border border-slate-700">SALIR</button>
      </div>

      <!-- SCANNER AREA GUIDE -->
      <div class="flex-1 w-full flex items-center justify-center relative">
         <div class="w-72 h-72 border-2 border-emerald-500 rounded-xl relative animate-pulse">
            <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
            <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
            <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
            <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>
            
            <div class="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50"></div>
            <p class="absolute -bottom-12 w-full text-center text-white/80 font-bold text-sm bg-black/50 px-2 py-1 rounded">
               Apunta al ZARX ID
            </p>
         </div>
      </div>

      <!-- FOOTER OVERLAY -->
      <div class="w-full bg-slate-900/90 p-6 pb-12 z-10 min-h-[150px]">
         @if (scanResult()) {
            <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 animate-slide-up">
               <div class="flex items-center gap-4 mb-2">
                  <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2"
                       [style.borderColor]="getResultColor()"
                       [style.color]="getResultColor()">
                      {{ getRankIcon(scanResult()!.rank) }}
                  </div>
                  <div>
                     <h3 class="text-white font-bold text-lg">{{ scanResult()!.rank }}</h3>
                     <p class="text-slate-400 text-xs font-mono">ID: {{ scanResult()!.sub | slice:0:8 }}...</p>
                  </div>
                  <div class="ml-auto text-2xl font-bold" [style.color]="getResultColor()">
                     {{ scanResult()!.score }}
                  </div>
               </div>
               
               <div class="flex gap-2 mt-4">
                  <button (click)="resetScan()" class="flex-1 py-3 bg-slate-700 text-white font-bold rounded-lg">ESCANEAR OTRO</button>
                  <button class="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg">VERIFICAR</button>
               </div>
            </div>
         } @else {
            <div class="text-center text-slate-500 text-sm">
               Esperando lectura de código seguro...
            </div>
         }
      </div>

    </div>
  `,
  styles: [`
    .animate-slide-up { animation: slideUp 0.3s ease-out; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class ScannerComponent implements OnDestroy {
  @Output() exit = new EventEmitter<void>();
  scanResult = signal<ZarxIdentity | null>(null);
  isScanning = signal(false);

  constructor() {
    this.startScan();
  }

  async startScan() {
    this.isScanning.set(true);
    
    // Check permissions
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
         // Hide background for transparency
         document.querySelector('body')?.classList.add('scanner-active');
         document.querySelector('html')?.classList.add('scanner-active');

         BarcodeScanner.hideBackground();
         
         const result = await BarcodeScanner.startScan(); 

         if (result.hasContent) {
            this.handleScan(result.content);
         }
      } else {
         console.warn('Permiso de cámara denegado');
         this.stopScan();
      }
    } catch (e) {
       console.error('Error starting scan:', e);
       this.stopScan();
    }
  }

  handleScan(content: string) {
     try {
        const data: ZarxIdentity = JSON.parse(content);
        
        // Basic Validation
        const now = Math.floor(Date.now() / 1000);
        
        if (data.exp < now) {
           this.triggerError('TOKEN EXPIRADO');
           return;
        }

        // Success
        this.scanResult.set(data);
        this.stopScan(false); // Stop camera but keep UI
        
        // Haptic Feedback based on Rank
        if (data.score < 500) {
           Haptics.notification({ type: NotificationType.Warning });
        } else {
           Haptics.impact({ style: ImpactStyle.Heavy });
        }

     } catch (e) {
        this.triggerError('CÓDIGO INVÁLIDO');
     }
  }

  triggerError(msg: string) {
     Haptics.notification({ type: NotificationType.Error });
     alert(msg);
     this.stopScan(); // Back to menu
  }

  stopScan(closeComponent = true) {
    try {
      BarcodeScanner.showBackground();
      BarcodeScanner.stopScan();
    } catch(e) {}
    
    document.querySelector('body')?.classList.remove('scanner-active');
    document.querySelector('html')?.classList.remove('scanner-active');

    this.isScanning.set(false);
    
    if (closeComponent) {
      this.exit.emit();
    }
  }

  resetScan() {
     this.scanResult.set(null);
     this.startScan();
  }

  getResultColor(): string {
     const rank = this.scanResult()?.rank;
     if (!rank) return '#fff';
     
     switch (rank) {
       case 'VIGILANTE': return '#22c55e';
       case 'SOSPECHOSO': return '#ef4444'; 
       case 'OBSERVADO': return '#f59e0b';
       default: return '#3b82f6';
     }
  }

  getRankIcon(rank: string): string {
    switch (rank) {
        case 'VIGILANTE': return '⭐';
        case 'SOSPECHOSO': return '⚠️';
        case 'OBSERVADO': return '👁️';
        case 'CIUDADANO_MODELO': return '🛡️';
        default: return '👤';
      }
  }

  ngOnDestroy() {
     this.stopScan();
  }
}
