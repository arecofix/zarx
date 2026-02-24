import { Injectable, inject } from '@angular/core';
import { ReputationService, ReputationRankInfo } from './reputation.service';

export interface Rank {
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  icon: string;
  benefit: string;
  nextRankName?: string;
}

/**
 * Gamification facade that delegates to ReputationService for rank data.
 * Provides progress calculation and rank access with UI-friendly labels.
 */
@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  private reputation = inject(ReputationService);

  calculateProgress(score: number) {
    const rankInfo = this.reputation.getRankInfo(score);
    const rank = this.toRank(rankInfo);
    const nextRankName = this.getNextRankName(rankInfo.rank);

    if (!nextRankName) {
       // Max Level
       return {
         currentRank: rank,
         progressPercent: 100,
         pointsToNext: 0,
         isMaxLevel: true
       };
    }

    const range = rank.maxScore - rank.minScore;
    const progress = score - rank.minScore;
    const percent = Math.min(100, Math.max(0, (progress / range) * 100));

    return {
      currentRank: { ...rank, nextRankName },
      progressPercent: Math.round(percent),
      pointsToNext: rank.maxScore - score + 1,
      isMaxLevel: false
    };
  }

  getRank(score: number): Rank {
    return this.toRank(this.reputation.getRankInfo(score));
  }

  private toRank(info: ReputationRankInfo): Rank {
    return {
      name: info.label,
      minScore: info.minScore,
      maxScore: info.maxScore,
      color: info.color,
      icon: info.icon,
      benefit: this.getBenefit(info.rank)
    };
  }

  private getBenefit(rank: string): string {
    switch (rank) {
      case 'SOSPECHOSO': return 'Acceso restringido';
      case 'OBSERVADO': return 'Reportes requieren doble validación';
      case 'CIUDADANO_MODELO': return 'Acceso estándar a monitoreo';
      case 'VIGILANTE': return 'Prioridad de Alerta + Ícono Especial';
      default: return '';
    }
  }

  private getNextRankName(rank: string): string | undefined {
    switch (rank) {
      case 'SOSPECHOSO': return 'Observado';
      case 'OBSERVADO': return 'Ciudadano Modelo';
      case 'CIUDADANO_MODELO': return 'Vigilante';
      default: return undefined;
    }
  }
}
