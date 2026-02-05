export interface SosSignal {
  isActive: boolean;
  victimId?: string;
  victimName?: string;
  audioUrl?: string; // Live audio URL or channel ID
  coords?: { lat: number; lng: number };
}
