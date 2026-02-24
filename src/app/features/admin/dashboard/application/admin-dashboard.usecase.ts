import { Injectable, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { ZoneService, Zone } from '../../services/zone.service';
import { ReportService } from '../../../../core/services/report.service';
import { CsvService } from '../../../../core/services/csv.service';
import { DashboardService } from '../../services/dashboard.service';
import { Logger } from '../../../../core/utils/logger';
import { AppConstants } from '../../../../core/constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardUseCase {
  private zoneService = inject(ZoneService);
  private reportService = inject(ReportService);
  private csvService = inject(CsvService);
  private router = inject(Router);
  public dashboardService = inject(DashboardService); // Expose for feed

  // State Signals
  sidebarOpen = signal(true);
  feedOpen = signal(true);
  showHeatmap = signal(false);
  showZones = signal(true);
  showZoneModal = signal(false);
  
  // Data Signals
  zones = signal<Zone[]>([]);
  heatmapLayer: any = null; // Leaflet layer reference
  zonesLayer: any = null; // Leaflet layer group

  // Zone Editing State
  newZoneData = signal<Partial<Zone>>({ name: '', risk_level: 50, type: 'DANGER' });
  currentDrawingLayer: any = null;

  constructor() {
    // Initialize Dashboard Feed
    this.dashboardService.getAlerts();
    this.dashboardService.subscribeToAlerts();
  }

  // --- Navigation & View Logic ---

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  toggleFeed() {
    this.feedOpen.update(v => !v);
  }

  checkScreenSize(width: number) {
    if (width < 768) {
      this.sidebarOpen.set(false);
      this.feedOpen.set(false);
    } else {
      this.sidebarOpen.set(true);
      this.feedOpen.set(true);
    }
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  // --- Zone Logic ---

  async loadZones() {
    // Dynamic import to avoid SSR issues
    const L = await import('leaflet');
    
    if (!this.zonesLayer) {
        this.zonesLayer = new L.FeatureGroup();
    }

    this.zonesLayer.clearLayers();
    const layers = await this.zoneService.loadZones();
    
    if (layers && layers.length > 0) {
       layers.forEach((layer: any) => {
         layer.addTo(this.zonesLayer);
       });

       const zonesData = layers.map((l: any) => l.feature.properties as Zone);
       this.zones.set(zonesData);
    }
  }

  async toggleZones(map: any) {
    this.showZones.update(v => !v);
    
    if (this.showZones()) {
      if (!this.zonesLayer) {
         // Initialize if needed
         const L = await import('leaflet');
         this.zonesLayer = new L.FeatureGroup();
         await this.loadZones();
      }
      this.zonesLayer.addTo(map);
    } else {
      if (this.zonesLayer) {
         this.zonesLayer.remove();
      }
    }
  }

  openZoneModal() {
    this.newZoneData.set({ name: '', risk_level: 50, type: 'DANGER' });
    this.showZoneModal.set(true);
  }

  closeZoneModal(drawnItems?: any) {
    this.showZoneModal.set(false);
    if (this.currentDrawingLayer && drawnItems) {
      drawnItems.removeLayer(this.currentDrawingLayer);
      this.currentDrawingLayer = null;
    }
  }

  async saveZone(drawnItems: any) {
    if (!this.currentDrawingLayer) return;

    const metadata = this.newZoneData();
    if (!metadata.name || !metadata.type) {
        alert('Nombre y Tipo son requeridos');
        return;
    }

    const color = this.getColorByType(metadata.type);
    this.currentDrawingLayer.setStyle({ color: color, fillColor: color });

    const { data, error } = await this.zoneService.saveZone(this.currentDrawingLayer, metadata as any);

    if (!error) {
       Logger.debug('Zone saved successfully:', data);
       this.loadZones(); // Refresh
       this.showZoneModal.set(false);
       this.currentDrawingLayer = null; 
       drawnItems.clearLayers();
    } else {
       Logger.error('Error saving zone:', error);
       alert('Error al guardar la zona.');
    }
  }

  getColorByType(type: string): string {
    switch(type) {
      case 'SAFE': return '#10b981';
      case 'DANGER': return '#ef4444';
      case 'BLOCKED': return '#64748b';
      case 'COMMERCIAL': return '#3b82f6';
      default: return '#fbbf24';
    }
  }

  // --- Heatmap Logic ---

  async toggleHeatmap(map: any) {
    this.showHeatmap.update(v => !v);
    
    if (this.showHeatmap()) {
      if (!this.heatmapLayer) {
        try {
          const L = await import('leaflet');
          await import('leaflet.heat');

          const rawData = await this.reportService.getHeatmapData();
          const points = rawData.map(d => [d.latitude, d.longitude, d.intensity]);
          
          // @ts-ignore
          if (L.heatLayer) {
             // @ts-ignore
             this.heatmapLayer = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 17 }).addTo(map);
          }
        } catch (e) {
           Logger.error('Heatmap load error', e);
        }
      } else {
        this.heatmapLayer.addTo(map);
      }
    } else {
      if (this.heatmapLayer) this.heatmapLayer.remove();
    }
  }

  // --- Reports Logic ---

  async downloadGeospatialReport() {
    Logger.debug('Generating Geospatial Report...');
    try {
      const reports = await this.reportService.getAllReports({}, 0, 1000);
      
      if (!reports || reports.length === 0) {
        alert('No hay reportes disponibles.');
        return;
      }

      const exportData = reports.map(r => ({
        ID: r.id,
        Fecha: new Date(r.created_at).toLocaleString(),
        Tipo: r.type,
        Prioridad: r.priority,
        Estado: r.status,
        Latitud: r.latitude,
        Longitud: r.longitude,
        Descripcion: r.description || '',
        Usuario: r.profiles?.username || r.profiles?.full_name || 'Anónimo',
        Evidencia: r.evidence_url || ''
      }));

      const fileName = `ZARX_Reporte_Geoespacial_${new Date().toISOString().split('T')[0]}`;
      this.csvService.exportToCsv(exportData, fileName);

    } catch (error) {
      Logger.error('Error generating report:', error);
      alert('Error generico al exportar.');
    }
  }
}
