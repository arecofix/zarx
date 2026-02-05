import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface PublicAlert {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  created_at: string;
  description?: string;
  has_evidence: boolean;
  evidence_url?: string;
  media_url?: string; // Standard field
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private supabase = inject(SupabaseService).client;

  // Cache signals
  recentAlerts = signal<PublicAlert[]>([]);
  heatmapData = signal<[number, number, number][]>([]);

  async loadPublicIntelligence() {
    try {
      const { data, error } = await this.supabase
        .from('public_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      // 1. Recent Markers (Last 7 Days)
      const recent = data.filter((a: any) => new Date(a.created_at) > sevenDaysAgo);
      this.recentAlerts.set(recent);

      // 2. Heatmap Data (Last 30 Days)
      // Format: [lat, lng, intensity]
      const historical = data.filter((a: any) => new Date(a.created_at) > thirtyDaysAgo);
      const heatPoints: [number, number, number][] = historical.map((a: any) => {
         // Intensity based on type severity (heuristic)
         let intensity = 0.5;
         if (['ROBO', 'VIOLENCE', 'FIRE'].includes(a.type)) intensity = 1.0;
         return [a.latitude, a.longitude, intensity];
      });

      this.heatmapData.set(heatPoints);

    } catch (err) {
      console.error('Failed to load public intelligence map data:', err);
    }
  }
}
