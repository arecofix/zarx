import { Injectable, inject, signal } from '@angular/core';
import { ReportService } from '../../../core/services/report.service';
import { LocationService } from '../../../core/services/location.service';
import { Report } from '../../../core/models';
import { Logger } from '../../../core/utils/logger';

@Injectable({
  providedIn: 'root' // Singleton or scoped to module depending on needs
})
export class HomeUseCase {
  private reportService = inject(ReportService);
  private locationService = inject(LocationService);

  // State Signals (DDD: The UseCase manages the state of this specific domain interaction)
  public criticalAlerts = signal<Report[]>([]);
  public networkReports = signal<Report[]>([]);
  public isLoading = signal<boolean>(false);

  async loadHomeData() {
    this.isLoading.set(true);
    try {
      // 1. Get Location
      const pos = await this.locationService.getCurrentPosition(); // Ensure we wait for it
      
      if (pos) {
        // Fetch all nearby reports (5km radius)
        const allReports = await this.reportService.getNearbyReports(
          pos.coords.latitude, 
          pos.coords.longitude,
          5000 
        );
        
        // Parse and map location/dates
        const mappedReports = allReports;

        const critical: Report[] = [];
        const network: Report[] = [];

        mappedReports.forEach(report => {
          // Filter by Status
          const isActive = ['OPEN', 'VALIDATED', 'VERIFIED', 'ENGAGED', 'PENDING'].includes(report.status);
          
          if (!isActive) return;

          const isCriticalType = this.reportService.isCritical(report.type);
          
          if (isCriticalType) {
             critical.push(report);
          } else {
             network.push(report);
          }
        });

        this.criticalAlerts.set(critical);
        this.networkReports.set(network);

      }
    } catch(e) {
      Logger.error('Error loading home data', e);
    } finally {
      this.isLoading.set(false);
    }
  }
}
