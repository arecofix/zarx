import { Injectable, inject } from '@angular/core';
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
   * Get clustered hotspots for map visualization.
   * NOTE: Requires `get_hotspots` RPC function in Supabase.
   */
  async getHotspots(hoursAgo: number = 168): Promise<Hotspot[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_hotspots', { hours_ago: hoursAgo });

      if (error) {
        console.warn('[Analytics] get_hotspots not available:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('[Analytics] get_hotspots failed:', e);
      return [];
    }
  }

  /**
   * Calculate local security index for a user position.
   * NOTE: Requires `calculate_security_index` RPC function in Supabase.
   */
  async getSecurityIndex(lat: number, lng: number): Promise<SecurityIndex | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_security_index', {
          user_lat: lat,
          user_lng: lng,
          radius_km: 2.0
        });

      if (error) {
        console.warn('[Analytics] calculate_security_index not available:', error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.warn('[Analytics] calculate_security_index failed:', e);
      return null;
    }
  }

  /**
   * Get hourly risk statistics for charts.
   * NOTE: Requires `hourly_risk_stats` view/table in Supabase.
   */
  async getHourlyRiskStats(): Promise<HourlyRisk[]> {
    try {
      const { data, error } = await this.supabase
        .from('hourly_risk_stats')
        .select('*');

      if (error) {
        console.warn('[Analytics] hourly_risk_stats not available:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('[Analytics] hourly_risk_stats failed:', e);
      return [];
    }
  }
}
