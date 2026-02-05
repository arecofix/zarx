import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ReputationService } from './reputation.service';
import QRCode from 'qrcode'; // Javascript library
import { BehaviorSubject, interval, switchMap, map, take } from 'rxjs';

export interface ZarxIdentity {
  sub: string;        // Subject (User ID)
  iat: number;        // Issued At
  exp: number;        // Expiration
  rank: string;       // Rank (VIGILANTE, etc)
  score: number;      // Current Score
  hash: string;       // Verification hash
}

@Injectable({
  providedIn: 'root'
})
export class IdentityService {
  private supabase = inject(SupabaseService);
  private reputationService = inject(ReputationService);

  // Signals
  qrDataUrl = signal<string | null>(null);
  timeLeft = signal<number>(60);
  isGenerating = signal<boolean>(false);
  
  private refreshInterval: any;
  private readonly REFRESH_RATE = 60000; // 60s

  constructor() {
    // Auto-refresh logic if needed via components
  }

  /**
   * Generates a new identity token and renders it to QR Data URL
   */
  async generateIdentityQr(): Promise<void> {
    this.isGenerating.set(true);
    try {
      const { data: { user } } = await this.supabase.client.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const score = this.reputationService.currentScore();
      const rankInfo = this.reputationService.rank();

      // Create Payload
      const now = Math.floor(Date.now() / 1000);
      const payload: ZarxIdentity = {
        sub: user.id,
        iat: now,
        exp: now + 60, // 60 seconds validity
        rank: rankInfo.rank, // Use literal 'VIGILANTE'
        score: score,
        hash: this.mockSign(user.id, now, score) // Mock signature for now
      };

      // Convert to JSON String
      const tokenString = JSON.stringify(payload);

      // Generate QR
      const url = await QRCode.toDataURL(tokenString, {
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
          dark: this.getQrColor(rankInfo.rank), // Rank based color
          light: '#00000000' // Transparent background
        }
      });

      this.qrDataUrl.set(url);
      this.startTimer();

    } catch (error) {
      console.error('Error generating Identity QR:', error);
    } finally {
      this.isGenerating.set(false);
    }
  }

  private startTimer() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    
    this.timeLeft.set(60);
    this.refreshInterval = setInterval(() => {
      const current = this.timeLeft();
      if (current > 0) {
        this.timeLeft.set(current - 1);
      } else {
        // Expired, regenerate
        this.generateIdentityQr();
      }
    }, 1000);
  }

  stopGenerator() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  private mockSign(uid: string, iat: number, score: number): string {
    // In production, this should be done via Edge Function with a private key
    // For prototype, we mimic a hash
    return btoa(`${uid}:${iat}:${score}:ZARX_SECRET`);
  }

  private getQrColor(rank: string): string {
    // Hex colors matching app theme
    switch (rank) {
      case 'VIGILANTE': return '#22c55e'; // Green-500
      case 'CIUDADANO_MODELO': return '#3b82f6'; // Blue-500
      case 'OBSERVADO': return '#f59e0b'; // Amber-500
      case 'SOSPECHOSO': return '#ef4444'; // Red-500
      default: return '#ffffff';
    }
  }
}
