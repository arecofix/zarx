import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { HeatmapPoint, ActiveHeatmapData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class HeatmapService {
  public supabase = inject(SupabaseService).client;
  
  // Signals for reactive heatmap data
  heatmapPoints = signal<HeatmapPoint[]>([]);
  isLoading = signal(false);
  lastUpdate = signal<Date | null>(null);

  constructor() {
    // Auto-refresh heatmap every 5 minutes
    setInterval(() => this.refreshHeatmap(), 5 * 60 * 1000);
  }

  /**
   * Get heatmap data from Supabase
   * @param hoursAgo How many hours back to fetch data (default: 24)
   */
  async getHeatmapData(hoursAgo: number = 24): Promise<HeatmapPoint[]> {
    this.isLoading.set(true);
    
    try {
      const { data, error } = await this.supabase
        .rpc('get_heatmap_data', { hours_ago: hoursAgo });

      if (error) {
        console.error('Error fetching heatmap data:', error);
        return [];
      }

      const points: HeatmapPoint[] = (data || []).map((point: any) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        intensity: Math.max(0, Math.min(1, point.intensity)), // Clamp 0-1
        alert_count: point.alert_count
      }));

      this.heatmapPoints.set(points);
      this.lastUpdate.set(new Date());
      
      return points;
    } catch (err) {
      console.error('Exception fetching heatmap:', err);
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get active heatmap from view (alerts within TTL)
   */
  async getActiveHeatmap(): Promise<ActiveHeatmapData[]> {
    try {
      const { data, error } = await this.supabase
        .from('active_heatmap')
        .select('*')
        .order('intensity', { ascending: false });

      if (error) {
        console.error('Error fetching active heatmap:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception fetching active heatmap:', err);
      return [];
    }
  }

  /**
   * Calculate danger level for a specific location
   * @param lat Latitude
   * @param lng Longitude
   * @param radiusMeters Radius in meters (default: 200)
   */
  async calculateDangerLevel(
    lat: number, 
    lng: number, 
    radiusMeters: number = 200
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_danger_level', {
          lat,
          lng,
          radius_meters: radiusMeters
        });

      if (error) {
        console.error('Error calculating danger level:', error);
        return 1; // Default to lowest danger
      }

      return data || 1;
    } catch (err) {
      console.error('Exception calculating danger level:', err);
      return 1;
    }
  }

  /**
   * Convert heatmap points to Leaflet.heat format
   * Format: [lat, lng, intensity]
   */
  toLeafletHeatFormat(points: HeatmapPoint[]): [number, number, number][] {
    return points.map(p => [p.latitude, p.longitude, p.intensity]);
  }

  /**
   * Apply temporal decay to active heatmap data
   * Alerts older than 48 hours lose opacity until they disappear
   * @param data Active heatmap data from view
   * @returns Points with adjusted intensity based on age
   */
  applyTemporalDecay(data: ActiveHeatmapData[]): HeatmapPoint[] {
    const now = new Date();
    const MAX_AGE_HOURS = 48;
    
    return data
      .map(alert => {
        const createdAt = new Date(alert.created_at);
        const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        // Calculate decay factor (1.0 at 0 hours, 0.0 at 48 hours)
        const decayFactor = Math.max(0, 1 - (ageHours / MAX_AGE_HOURS));
        
        // Apply decay to base intensity
        const baseIntensity = alert.intensity || (alert.danger_level / 5);
        const adjustedIntensity = baseIntensity * decayFactor;
        
        return {
          latitude: alert.latitude,
          longitude: alert.longitude,
          intensity: Math.max(0, Math.min(1, adjustedIntensity)),
          alert_count: 1
        };
      })
      .filter(point => point.intensity > 0.05); // Filter out nearly invisible points
  }

  /**
   * Get heatmap with temporal decay applied
   * This combines active alerts with decay based on age
   */
  async getDecayedHeatmap(): Promise<HeatmapPoint[]> {
    const activeData = await this.getActiveHeatmap();
    return this.applyTemporalDecay(activeData);
  }

  /**
   * Refresh heatmap data
   */
  async refreshHeatmap(hoursAgo: number = 24): Promise<void> {
    await this.getHeatmapData(hoursAgo);
  }

  /**
   * Subscribe to real-time alert changes to update heatmap
   */
  subscribeToAlertChanges(callback: () => void) {
    const channel = this.supabase
      .channel('heatmap-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log('Alert change detected, refreshing heatmap:', payload);
          this.refreshHeatmap();
          callback();
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Get color for danger level (for UI)
   */
  getDangerColor(level: number): string {
    switch (level) {
      case 5: return '#dc2626'; // red-600
      case 4: return '#ea580c'; // orange-600
      case 3: return '#f59e0b'; // amber-500
      case 2: return '#eab308'; // yellow-500
      case 1: return '#84cc16'; // lime-500
      default: return '#6b7280'; // gray-500
    }
  }

  /**
   * Get danger label (for UI)
   */
  getDangerLabel(level: number): string {
    switch (level) {
      case 5: return 'Crítico';
      case 4: return 'Alto';
      case 3: return 'Medio';
      case 2: return 'Bajo';
      case 1: return 'Muy Bajo';
      default: return 'Desconocido';
    }
  }
}
