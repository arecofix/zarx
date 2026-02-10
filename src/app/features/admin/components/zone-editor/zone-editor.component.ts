import { Component, OnInit, OnDestroy, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { ZoneService, Zone } from '../../services/zone.service';

@Component({
  selector: 'app-zone-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-screen h-screen bg-slate-950 overflow-hidden flex">
      
      <!-- TOGGLE SIDEBAR BUTTON (Mobile Only) -->
      <button *ngIf="!sidebarOpen()" (click)="toggleSidebar()" 
              class="absolute top-4 left-4 z-30 p-2 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700 text-white shadow-lg md:hidden">
         <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      <!-- SIDEBAR -->
      <div class="absolute inset-y-0 left-0 z-40 w-full sm:w-80 bg-slate-900/95 backdrop-blur border-r border-slate-700 p-4 flex flex-col transition-transform duration-300 md:relative md:translate-x-0"
           [class.-translate-x-full]="!sidebarOpen()">
        
        <div class="flex justify-between items-center mb-6">
           <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <span>🛡️</span> Control Territorial
           </h2>
           <!-- Close Sidebar (Mobile) -->
           <button (click)="toggleSidebar()" class="md:hidden text-slate-400 hover:text-white">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
           </button>
        </div>

        <!-- Zones List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
           <div *ngFor="let zone of zones()" class="p-3 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-750 transition-colors group relative">
              <div class="flex justify-between items-start mb-1">
                 <h3 class="font-bold text-white text-sm truncate pr-2">{{ zone.name }}</h3>
                 <span class="text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap"
                       [class.bg-emerald-500]="zone.type === 'SAFE'"
                       [class.text-emerald-950]="zone.type === 'SAFE'"
                       [class.bg-red-500]="zone.type === 'DANGER'"
                       [class.text-white]="zone.type === 'DANGER'"
                       [class.bg-slate-500]="zone.type === 'BLOCKED'"
                       [class.text-white]="zone.type === 'BLOCKED'"
                       [class.bg-blue-500]="zone.type === 'COMMERCIAL'"
                       [class.text-white]="zone.type === 'COMMERCIAL'">
                    {{ zone.type }}
                 </span>
              </div>
              <div class="flex justify-between items-center text-xs text-slate-400">
                 <span>Riesgo: {{ zone.risk_level }}</span>
                 <button (click)="deleteZone(zone)" class="text-red-400 hover:text-red-300 transition-opacity font-bold uppercase text-[10px]">
                    🗑️ Borrar
                 </button>
              </div>
           </div>
           
           <div *ngIf="zones().length === 0" class="text-center py-8 text-slate-500 italic text-sm">
              No hay zonas registradas. <br>
              Usa las herramientas de dibujo en el mapa.
           </div>
        </div>

        <div class="mt-4 pt-4 border-t border-slate-700">
           <button (click)="goToDashboard()" class="w-full py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors font-bold text-sm tracking-wide uppercase border border-slate-600">
              ⬅ Volver al Panel
           </button>
        </div>
      </div>

      <!-- MAP AREA -->
      <div class="flex-1 relative z-0">
         <div id="zoneMap" class="w-full h-full z-0"></div>
         
         <!-- Loading Overlay -->
         <div *ngIf="isLoading()" class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div class="flex flex-col items-center gap-4">
               <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
               <span class="text-white font-mono text-xs animate-pulse">PROCESANDO DATOS GEOESPACIALES...</span>
            </div>
         </div>
      </div>

      <!-- NEW ZONE MODAL -->
      <div *ngIf="showModal()" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
         <div class="bg-slate-900 rounded-xl max-w-sm w-full p-6 border border-slate-600 shadow-2xl relative">
            <h3 class="text-lg font-black text-white mb-4 tracking-wide uppercase border-b border-slate-700 pb-2">
               Nueva Zona Táctica
            </h3>
            
            <div class="space-y-4">
               <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Nombre de Zona</label>
                  <input [(ngModel)]="newZone.name" placeholder="Ej: Zona Norte Segura" type="text" class="w-full bg-black border border-slate-700 rounded p-3 text-white text-sm focus:border-emerald-500 outline-none placeholder:text-slate-600 transition-colors">
               </div>

               <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Clasificación</label>
                  <div class="grid grid-cols-2 gap-2">
                     <button (click)="newZone.type = 'SAFE'" 
                             class="p-2 rounded border text-xs font-bold transition-all flex items-center justify-center gap-1"
                             [class.bg-emerald-600]="newZone.type === 'SAFE'"
                             [class.border-emerald-500]="newZone.type === 'SAFE'"
                             [class.text-white]="newZone.type === 'SAFE'"
                             [class.bg-slate-800]="newZone.type !== 'SAFE'"
                             [class.text-slate-400]="newZone.type !== 'SAFE'"
                             [class.border-slate-700]="newZone.type !== 'SAFE'">
                        🛡️ SEGURA
                     </button>
                     <button (click)="newZone.type = 'DANGER'" 
                             class="p-2 rounded border text-xs font-bold transition-all flex items-center justify-center gap-1"
                             [class.bg-red-600]="newZone.type === 'DANGER'"
                             [class.border-red-500]="newZone.type === 'DANGER'"
                             [class.text-white]="newZone.type === 'DANGER'"
                             [class.bg-slate-800]="newZone.type !== 'DANGER'"
                             [class.text-slate-400]="newZone.type !== 'DANGER'"
                             [class.border-slate-700]="newZone.type !== 'DANGER'">
                        ⚠️ PELIGRO
                     </button>
                  </div>
               </div>

               <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Nivel de Riesgo: {{ newZone.risk_level }}</label>
                  <input [(ngModel)]="newZone.risk_level" type="range" min="1" max="10" class="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer">
                  <div class="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                     <span>BAJO</span>
                     <span>ALTO</span>
                  </div>
               </div>
            </div>

            <div class="flex gap-3 mt-6 pt-4 border-t border-slate-700">
               <button (click)="cancelCreate()" class="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs uppercase transition-colors">Cancelar</button>
               <button (click)="saveZone()" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase shadow-lg shadow-emerald-900/20 transition-all">Guardar Zona</button>
            </div>
         </div>
      </div>

    </div>
  `,
  styles: [`
    /* Leaflet Draw Custom Styles overrides */
    :host ::ng-deep .leaflet-draw-toolbar a {
      background-color: #1e293b;
      border-color: #334155;
      color: white;
    }
    :host ::ng-deep .leaflet-draw-toolbar a:hover {
      background-color: #334155;
    }
  `]
})
export class ZoneEditorComponent implements OnInit, OnDestroy {
  private zoneService = inject(ZoneService);
  private ngZone = inject(NgZone);
  private router = inject(Router);

  map!: L.Map;
  drawControl!: any; // L.Control.Draw types might be tricky
  drawnItems = new L.FeatureGroup();
  
  zones = signal<any[]>([]);
  isLoading = signal(false);
  showModal = signal(false);

  // New Zone Form
  currentLayer: any = null;
  newZone = {
    name: '',
    type: 'SAFE',
    risk_level: 1
  };

  sidebarOpen = signal(true);

  goToDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  async deleteZone(zone: any) {
    if(!confirm(`¿Eliminar zona "${zone.name}"?`)) return;
    
    this.isLoading.set(true);
    const { error } = await this.zoneService.deleteZone(zone.id);

    if (error) {
       this.isLoading.set(false);
       alert('Error al eliminar zona: ' + error.message);
    } else {
       await this.loadZones();
       this.isLoading.set(false);
    }
  }

  async ngOnInit() {
    this.isLoading.set(true);
    // Initialize Map OUTSIDE Angular Zone to avoid excessive change detection
    this.ngZone.runOutsideAngular(() => {
      this.initMap();
    });
    
    await this.loadZones();
    this.isLoading.set(false);
  }

  private initMap(): void {
    // Basic Map Init - Centered on Arecofix aprox
    this.map = L.map('zoneMap', {
       center: [-34.6037, -58.3816], // Buenos Aires Default
       zoom: 13,
       zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap, ©CartoDB'
    }).addTo(this.map);

    // FeatureGroup to store editable layers
    this.map.addLayer(this.drawnItems);

    // Init Draw Control
    const drawOptions: any = {
        edit: {
            featureGroup: this.drawnItems
        },
        draw: {
            polygon: {
                allowIntersection: false,
                drawError: { color: '#e1e100', message: '<strong>¡Error!</strong> No puedes cruzar líneas.' },
                shapeOptions: { color: '#ef4444' }, // Táctica roja por defecto
                showArea: true
            },
            circle: {
                shapeOptions: { color: '#3b82f6' },
                showRadius: true,
                metric: true,
                feet: false
            },
            rectangle: {
                shapeOptions: { color: '#10b981' }
            },
            // Disable points/lines for zones
            circlemarker: false,
            marker: false,
            polyline: false
        }
    };
    
    // Add touch support hint if mobile
    if (L.Browser.mobile) {
       // Leaflet Draw handles touch but icon size helps
    }

    this.drawControl = new L.Control.Draw(drawOptions);
    this.map.addControl(this.drawControl);

    // Event Handling
    this.map.on(L.Draw.Event.CREATED, (e: any) => {
        const layer = e.layer;
        const type = e.layerType;

        this.ngZone.run(() => {
           this.currentLayer = layer;
           this.newZone.type = 'DANGER'; // Default to Danger
           this.drawnItems.addLayer(layer);
           this.showModal.set(true);
        });
    });
  }

  async loadZones() {
    const zones = await this.zoneService.loadZones();
    this.zones.set(zones.map((l: any) => l.feature?.properties));
    
    // Add to map
    this.drawnItems.clearLayers(); // Clear duplicate local layers if any
    zones.forEach(layer => {
        this.drawnItems.addLayer(layer);
    });
  }

  async saveZone() {
    if (!this.currentLayer) return;

    this.isLoading.set(true);
    try {
        let layerToSave = this.currentLayer;

        // CONVERT CIRCLE TO POLYGON (Proxy Strategy)
        if (typeof this.currentLayer.getRadius === 'function') {
             const center = this.currentLayer.getLatLng();
             const radius = this.currentLayer.getRadius();
             
             const points = [];
             for (let i = 0; i < 64; i++) {
                 const angle = (i * 360 / 64) * Math.PI / 180;
                 // 1 degree lat ~= 111km. 1 degree lng ~= 111km * cos(lat).
                 const dLat = (radius / 111320) * Math.cos(angle);
                 const dLng = (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
                 points.push([center.lat + dLat, center.lng + dLng]);
             }
             layerToSave = L.polygon(points as any);
        }

        const { error } = await this.zoneService.saveZone(layerToSave, {
            name: this.newZone.name,
            type: this.newZone.type,
            risk_level: this.newZone.risk_level
        });

        if (error) {
            throw error;
        }

        // Reset form
        this.showModal.set(false);
        this.newZone = { name: '', type: 'SAFE', risk_level: 1 };
        this.currentLayer = null;

        // Reload lists
        this.drawnItems.clearLayers();
        await this.loadZones();

    } catch (e: any) {
        console.error('Error saving zone', e);
        alert('Error al guardar zona: ' + (e.message || e));
    } finally {
        this.isLoading.set(false);
    }
  }

  cancelCreate() {
     if (this.currentLayer) {
        this.drawnItems.removeLayer(this.currentLayer);
        this.currentLayer = null;
     }
     this.showModal.set(false);
  }

  ngOnDestroy() {
    if (this.map) {
       this.map.remove();
    }
  }
}
