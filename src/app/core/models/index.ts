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

export interface Alert {
  id?: string;
  user_id?: string;
  type: ReportType | string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ENGAGED' | 'RESOLVED' | 'FALSE_ALARM' | 'PENDING' | 'VALIDATED' | 'VERIFIED';
  location: string; // geography(POINT)
  latitude?: number;
  longitude?: number;
  description?: string;
  evidence_url?: string;
  has_evidence?: boolean;
  timestamp?: Date | string;
  created_at?: string;
  profiles?: Profile;
  
  // Advanced reporting fields
  reporting_method?: ReportingMethod;
  danger_level?: number; // 1-5
  is_verified?: boolean;
  is_panic?: boolean;
  location_method?: LocationMethod;
  ttl_expires_at?: string;
  
  // New fields for dispatch console
  descripcion_detallada?: string; // Detailed description
  personas_involucradas?: number; // Number of people involved
  address?: string; // Geocoded address
  
  // Media evidence fields
  media_url?: string; // Single media URL (legacy)
  media_urls?: string[]; // Array of media URLs for multiple evidence files
}

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
