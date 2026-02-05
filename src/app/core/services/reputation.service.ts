import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ReputationChange {
  points: number;
  reason: string;
  alertId?: string;
}

export interface ReputationHistory {
  id: string;
  user_id: string;
  points_change: number;
  reason: string;
  alert_id?: string;
  created_at: string;
  created_by?: string;
}

export type ReputationRank = 'VIGILANTE' | 'CIUDADANO_MODELO' | 'OBSERVADO' | 'SOSPECHOSO';

export interface ReputationRankInfo {
  rank: ReputationRank;
  label: string;
  color: string;
  icon: string;
  minScore: number;
  maxScore: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReputationService {
  private supabase = inject(SupabaseService).client;

  // Signals
  currentScore = signal<number>(500);
  history = signal<ReputationHistory[]>([]);
  isLoading = signal(false);

  // Computed
  rank = computed<ReputationRankInfo>(() => this.getRankInfo(this.currentScore()));
  progressToNextRank = computed(() => this.calculateProgress(this.currentScore()));

  // Reputation constants
  private readonly POINTS = {
    ALERT_VALIDATED: 50,
    WITNESS_JOINED: 10,
    FALSE_ALARM: -100,
    REFERRAL_COMPLETED: 25,
    FIRST_ALERT: 20,
    MALICIOUS_REPORT: -200
  };

  private readonly RANKS: ReputationRankInfo[] = [
    {
      rank: 'SOSPECHOSO',
      label: 'Sospechoso',
      color: '#EF4444', // red-500
      icon: '⚠️',
      minScore: 0,
      maxScore: 299
    },
    {
      rank: 'OBSERVADO',
      label: 'Observado',
      color: '#F59E0B', // amber-500
      icon: '👁️',
      minScore: 300,
      maxScore: 499
    },
    {
      rank: 'CIUDADANO_MODELO',
      label: 'Ciudadano Modelo',
      color: '#3B82F6', // blue-500
      icon: '🛡️',
      minScore: 500,
      maxScore: 799
    },
    {
      rank: 'VIGILANTE',
      label: 'Vigilante',
      color: '#10B981', // emerald-500
      icon: '⭐',
      minScore: 800,
      maxScore: 1000
    }
  ];

  /**
   * Load current user's reputation score
   */
  async loadCurrentScore(): Promise<number> {
    this.isLoading.set(true);

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user logged in');
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select('reputation_score')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const score = data?.reputation_score ?? 500;
      this.currentScore.set(score);
      return score;

    } catch (error) {
      console.error('Error loading reputation score:', error);
      return 500;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load reputation history
   */
  async loadHistory(userId?: string): Promise<ReputationHistory[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      const { data, error } = await this.supabase
        .from('reputation_history')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const historyData = (data as ReputationHistory[]) || [];
      this.history.set(historyData);
      return historyData;

    } catch (error) {
      console.error('Error loading reputation history:', error);
      return [];
    }
  }

  /**
   * Update reputation score (admin only)
   */
  // Methods replaced by Database Triggers
  // Logic is now centralized in PostgreSQL for security (Gamification Trigger)

  /**
   * Get rank info for a score
   */
  getRankInfo(score: number): ReputationRankInfo {
    return this.RANKS.find(r => score >= r.minScore && score <= r.maxScore) || this.RANKS[0];
  }

  /**
   * Calculate progress to next rank
   */
  private calculateProgress(score: number): number {
    const currentRank = this.getRankInfo(score);
    const range = currentRank.maxScore - currentRank.minScore;
    const progress = score - currentRank.minScore;
    return Math.round((progress / range) * 100);
  }

  /**
   * Get score color (for UI)
   */
  getScoreColor(score: number): string {
    return this.getRankInfo(score).color;
  }

  /**
   * Check if user can access sentinel mode
   */
  async checkSentinelAccess(): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) return false;

      const { data, error } = await this.supabase
        .from('profiles')
        .select('sentinel_mode_unlocked, referral_count')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      return data?.sentinel_mode_unlocked || false;

    } catch (error) {
      console.error('Error checking sentinel access:', error);
      return false;
    }
  }

  /**
   * Get referral code
   */
  async getReferralCode(): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) return null;

      const { data, error } = await this.supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      return data?.referral_code || null;

    } catch (error) {
      console.error('Error getting referral code:', error);
      return null;
    }
  }

  /**
   * Generate referral link
   */
  async generateReferralLink(): Promise<string> {
    const code = await this.getReferralCode();
    if (!code) return '';

    const baseUrl = window.location.origin;
    return `${baseUrl}/auth/login?ref=${code}`;
  }
}
