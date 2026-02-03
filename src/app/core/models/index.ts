export enum ReportType {
  SOS = 'SOS',
  PANIC = 'PANIC',
  SUSPICIOUS_VEHICLE = 'SUSPICIOUS_VEHICLE',
  FIGHT = 'FIGHT',
  VANDALISM = 'VANDALISM',
  POWER_OUTAGE = 'POWER_OUTAGE', // Corte de luz general
  STREETLIGHT_OFF = 'STREETLIGHT_OFF', // Luminaria rota
  POTHOLE = 'POTHOLE',
  TRASH = 'TRASH',
  FIRE = 'FIRE',
  MEDICAL = 'MEDICAL',
  // Legacy or specific
  NO_LIGHT = 'NO_LIGHT', 
  MILITARY_OPS = 'MILITARY_OPS'
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  role: 'civilian' | 'responder' | 'military' | 'admin';
  avatar_url?: string;
  last_known_location?: string; // geography(POINT)
}

export interface Alert {
  id?: string; // Optional for new alerts
  user_id?: string;
  type: ReportType | string; // Allow string for flexibility but prefer Enum
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ENGAGED' | 'RESOLVED' | 'FALSE_ALARM';
  location: string; // geography(POINT)
  latitude?: number;
  longitude?: number;
  description?: string;
  evidence_url?: string; // Added from previous step context
  timestamp?: Date | string; // Support both
  created_at?: string;
  profiles?: Profile; // Joined data
}
