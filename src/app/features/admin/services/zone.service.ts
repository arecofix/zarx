import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import * as L from 'leaflet';

export interface Zone {
  id?: string;
  name: string;
  risk_level: number;
  type: 'SAFE' | 'DANGER' | 'BLOCKED' | 'COMMERCIAL';
  geom: any; // GeoJSON geometry (input) or coordinate string (output)
}

@Injectable({
  providedIn: 'root'
})
export class ZoneService {
  private supabase = inject(SupabaseService).client;

  /**
   * Guarda una zona en Supabase.
   * Convierte la capa de Leaflet a formato compatible con PostGIS.
   */
  async saveZone(layer: any, metadata: { name: string; risk_level: number; type: string }): Promise<{ data: any; error: any }> {
    // 1. Obtener GeoJSON de la capa de Leaflet
    const geoJson = layer.toGeoJSON();
    
    // 2. Extraer la geometría (PostGIS espera la geometría, no el Feature completo si es INSERT directo a columna geom)
    const geometry = geoJson.geometry;

    // 3. Insertar en Supabase
    // Supabase JS insertará el objeto JSON geometry. PostGIS hará el casting automático a geometry(Polygon, 4326)
    return this.supabase
      .from('zones')
      .insert({
        name: metadata.name,
        risk_level: metadata.risk_level,
        type: metadata.type,
        geom: geometry // Pasamos el objeto { type: 'Polygon', coordinates: [...] }
      })
      .select()
      .single();
  }

  /**
   * Carga las zonas desde Supabase.
   * Convierte la respuesta (que puede venir como hex o JSON) a capas de Leaflet.
   */
  async loadZones(): Promise<L.Layer[]> {
    // Truco Robustez: Hacemos un cast explícito en la query para devolver GeoJSON siempre.
    // Esto evita lidiar con WKB hexadecimal o configuraciones extrañas del servidor.
    const { data, error } = await this.supabase
      .from('zones')
      .select('*, geom_json:geom::json'); // Alias geom_json forzando cast a JSON

    if (error) {
      console.error('Error loading zones:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const layers: L.Layer[] = [];

    data.forEach((zone: any) => {
      // Usamos geom_json si existe (cast explícito), o geom si el servidor ya lo devolvió limpio
      const geoData = zone.geom_json || zone.geom;

      if (geoData) {
        // Creamos una capa GeoJSON de Leaflet
        // Envolvemos en un FeatureCollection o Feature básico si es solo geometry
        const feature = {
            type: "Feature",
            properties: {
                id: zone.id,
                name: zone.name,
                risk_level: zone.risk_level,
                type: zone.type
            },
            geometry: geoData
        };

        // Obtenemos el estilo según el tipo
        const color = this.getColorByType(zone.type);

        const layer = L.geoJSON(feature as any, {
          style: {
            color: color,
            fillColor: color,
            fillOpacity: 0.2,
            weight: 2
          }
        });

        // Agregamos a la lista plana de capas (nota: L.geoJSON devuelve un LayerGroup, extraemos las capas internas)
        layer.eachLayer((l) => {
            // Asignamos propiedades extra para referencia fácil luego si se necesita
            (l as any).feature = feature;
            layers.push(l);
        });
      }
    });

    return layers;
  }

  async deleteZone(id: string) {
    return this.supabase
      .from('zones')
      .delete()
      .eq('id', id);
  }

  private getColorByType(type: string): string {
    switch(type) {
      case 'SAFE': return '#10b981'; // Emerald
      case 'DANGER': return '#ef4444'; // Red
      case 'BLOCKED': return '#64748b'; // Slate
      case 'COMMERCIAL': return '#3b82f6'; // Blue
      default: return '#fbbf24';
    }
  }
}
