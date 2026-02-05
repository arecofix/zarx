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
    <div class="flex h-screen bg-slate-900">
      
      <!-- SIDEBAR -->
      <div class="w-80 bg-slate-900 border-r border-slate-700 p-4 flex flex-col">
        <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
           <span>🛡️</span> Control Territorial
        </h2>

        <!-- Zones List -->
        <div class="flex-1 overflow-y-auto space-y-2">
           <div *ngFor="let zone of zones()" class="p-3 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors group">
              <div class="flex justifying-between items-start mb-1">
                 <h3 class="font-bold text-white">{{ zone.name }}</h3>
                 <span class="text-[10px] px-2 py-0.5 rounded font-bold"
                       [class.bg-emerald-500]="zone.type === 'SAFE'"
                       [class.text-emerald-950]="zone.type === 'SAFE'"
                       [class.bg-red-500]="zone.type === 'DANGER'"
                       [class.text-white]="zone.type === 'DANGER'">
                    {{ zone.type }}
                 </span>
              </div>
              <div class="flex justify-between items-center text-xs text-slate-400">
                 <span>Riesgo: {{ zone.risk_level }}</span>
                 <button class="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">Borrar</button>
              </div>
           </div>
        </div>

        <div class="mt-4 pt-4 border-t border-slate-700">
           <button (click)="goToDashboard()" class="w-full py-3 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white transition-colors">
              Volver al Panel
           </button>
        </div>
      </div>

      <!-- MAP AREA -->
      <div class="flex-1 relative">
         <div id="zoneMap" class="w-full h-full z-10"></div>
         
         <!-- Loading Overlay -->
         <div *ngIf="isLoading()" class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
         </div>
      </div>

      <!-- NEW ZONE MODAL -->
      <div *ngIf="showModal()" class="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
         <div class="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700 animate-scale-up">
            <h3 class="text-xl font-bold text-white mb-4">Nueva Zona Identificada</h3>
            
            <div class="space-y-4">
               <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">NOMBRE DE LA ZONA</label>
                  <input [(ngModel)]="newZone.name" type="text" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none">
               </div>

               <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">TIPO DE ZONA</label>
                  <div class="grid grid-cols-2 gap-2">
                     <button (click)="newZone.type = 'SAFE'" 
                             class="p-3 rounded-lg border text-sm font-bold transition-all"
                             [class.bg-emerald-500]="newZone.type === 'SAFE'"
                             [class.border-emerald-500]="newZone.type === 'SAFE'"
                             [class.bg-slate-900]="newZone.type !== 'SAFE'"
                             [class.border-slate-700]="newZone.type !== 'SAFE'">
                        🛡️ ZONA SEGURA
                     </button>
                     <button (click)="newZone.type = 'DANGER'" 
                             class="p-3 rounded-lg border text-sm font-bold transition-all"
                             [class.bg-red-500]="newZone.type === 'DANGER'"
                             [class.border-red-500]="newZone.type === 'DANGER'"
                             [class.bg-slate-900]="newZone.type !== 'DANGER'"
                             [class.border-slate-700]="newZone.type !== 'DANGER'">
                        ⚠️ ZONA ROJA
                     </button>
                  </div>
               </div>

               <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">NIVEL DE RIESGO (0-10)</label>
                  <input [(ngModel)]="newZone.risk_level" type="range" min="0" max="10" class="w-full accent-emerald-500">
                  <div class="text-center font-bold text-2xl text-white">{{ newZone.risk_level }}</div>
               </div>
            </div>

            <div class="flex gap-3 mt-6">
               <button (click)="cancelCreate()" class="flex-1 py-3 bg-slate-700 text-white rounded-lg font-bold">CANCELAR</button>
               <button (click)="saveZone()" class="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold">CONFIRMAR ZONA</button>
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

  goToDashboard() {
    this.router.navigate(['/admin/dashboard']);
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
        // PostGIS 'polygon' type doesn't support circles natively unless we use GeometryCollection or buffer.
        // For compatibility with 'zones' table geometry(Polygon), we convert circle to a 64-vertex polygon.
        if (typeof this.currentLayer.getRadius === 'function') {
             const center = this.currentLayer.getLatLng();
             const radius = this.currentLayer.getRadius();
             
             // Create a polygon approximating the circle
             // We can use a utility or just create a circle-marker styled polygon, 
             // but visually simpler is to let the service handle GEOJSON conversion or do it here.
             // Leaflet 'toGeoJSON()' on a circle returns a Point with "radius" property sometimes or just a point.
             // It's safer to generate the polygon points manually or use a simple hack:
             // Use a library or approximate. 
             // Approximation: Use Turf or simple math. Let's do simple math for dependency-free speed.
             const points = [];
             for (let i = 0; i < 64; i++) {
                 const angle = (i * 360 / 64) * Math.PI / 180;
                 // 1 degree lat ~= 111km. 1 degree lng ~= 111km * cos(lat).
                 // This is rough estimation but good enough for UI zones (meters).
                 const dLat = (radius / 111320) * Math.cos(angle);
                 const dLng = (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
                 points.push([center.lat + dLat, center.lng + dLng]);
             }
             layerToSave = L.polygon(points as any);
        }

        await this.zoneService.saveZone(layerToSave, {
            name: this.newZone.name,
            type: this.newZone.type,
            risk_level: this.newZone.risk_level
        });

        // Reset form
        this.showModal.set(false);
        this.newZone = { name: '', type: 'SAFE', risk_level: 1 };
        this.currentLayer = null;

        // Reload lists
        this.drawnItems.clearLayers();
        await this.loadZones();

    } catch (e) {
        console.error('Error saving zone', e);
        alert('Error al guardar zona');
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
