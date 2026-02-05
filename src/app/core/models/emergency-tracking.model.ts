export interface EmergencyTracking {
  id: string;
  emergency_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
}
