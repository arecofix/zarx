import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Hotspot {
  cluster_id: number;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  total_alerts: number;
  risk_score: number;
  main_type: string;
}

export interface SecurityIndex {
  status: 'TRANQUILO' | 'ATENCIÓN' | 'ACTIVIDAD ALTA';
  color: 'GREEN' | 'YELLOW' | 'ORANGE';
  active_alerts: number;
  resolved_last_week: number;
  danger_score: number;
}

export interface HourlyRisk {
  hour_of_day: number;
  type: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private supabase = inject(SupabaseService).client;

  /**
   * Get clustered hotspots for map visualization
   */
  async getHotspots(hoursAgo: number = 168): Promise<Hotspot[]> {
    const { data, error } = await this.supabase
      .rpc('get_hotspots', { hours_ago: hoursAgo });
      
    if (error) {
      console.error('Error fetching hotspots:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Calculate local security index for a user position
   */
  async getSecurityIndex(lat: number, lng: number): Promise<SecurityIndex | null> {
    const { data, error } = await this.supabase
      .rpc('calculate_security_index', { 
        user_lat: lat, 
        user_lng: lng,
        radius_km: 2.0 
      });

    if (error) {
       console.error('Error calculating security index:', error);
       return null;
    }
    return data;
  }

  /**
   * Get hourly risk statistics for charts
   */
  async getHourlyRiskStats(): Promise<HourlyRisk[]> {
    const { data, error } = await this.supabase
      .from('hourly_risk_stats')
      .select('*');

    if (error) {
      console.error('Error fetching hourly stats:', error);
      return [];
    }
    return data || [];
  }
}
