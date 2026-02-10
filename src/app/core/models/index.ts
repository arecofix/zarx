export enum ReportType {
  SOS = 'SOS',
  ROBO = 'ROBO',
  DELITO_PROCESO = 'DELITO_PROCESO', // Entraderas, robos a mano armada, venta de estupefacientes
  ACTIVIDAD_DELICTIVA = 'ACTIVIDAD_DELICTIVA', // Catch-all para delitos críticos
  ACTIVIDAD_SOSPECHOSA = 'ACTIVIDAD_SOSPECHOSA', // Vehículos o personas merodeando
  INCENDIO = 'INCENDIO',
  ACCIDENTE = 'ACCIDENTE',
  EMERGENCIA_MEDICA = 'EMERGENCIA_MEDICA', // Accidentes o personas descompensadas
  VANDALISMO = 'VANDALISMO',
  CORTE_DE_LUZ = 'CORTE_DE_LUZ',
  LUMINARIA_ROTA = 'LUMINARIA_ROTA',
  BACHE = 'BACHE',
  BASURA = 'BASURA',
  PELIGRO_VIAL = 'PELIGRO_VIAL', // Abandoned cars, fallen branches, etc.
  PELIGRO_VIAL_OBSTRUCCION = 'PELIGRO_VIAL_OBSTRUCCION',
  RIESGO_VIDA = 'RIESGO_VIDA', // Mental health, suicide attempts
}

export type ReportingMethod = 'automatic' | 'manual';
export type LocationMethod = 'gps' | 'manual';

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  role: 'civilian' | 'responder' | 'military' | 'admin';
  avatar_url?: string;
  username?: string;
  last_known_location?: string; // geography(POINT)
  reputation_score?: number;
  trust_level?: 'OBSERVED' | 'CITIZEN' | 'WATCHER';
  invite_code?: string;
  referred_by?: string;
}

export interface Report {
  id: string;
  user_id: string;
  type: ReportType | string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'VALIDATED' | 'FALSE_ALARM' | 'RESOLVED' | 'VERIFIED' | 'OPEN' | 'ENGAGED';
  location: string; // PostGIS POINT
  latitude?: number;
  longitude?: number;
  description?: string;
  // Extended fields for Dispatch/Legacy
  address?: string; // Geocoded address
  is_panic?: boolean;
  danger_level?: number;
  is_verified?: boolean;
  personas_involucradas?: number;
  descripcion_detallada?: string;
  
  // Restored Base Fields
  evidence_url?: string;
  created_at: string;
  
  // Joins
  profiles?: Profile;
}

// Alias for compatibility if needed, or deprecate Alert in favor of Report
export type Alert = Report;

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number; // 0-1
  alert_count?: number;
}

export interface ActiveHeatmapData {
  latitude: number;
  longitude: number;
  type: string;
  danger_level: number;
  created_at: string;
  ttl_expires_at: string;
  hours_remaining: number;
  intensity: number;
}
