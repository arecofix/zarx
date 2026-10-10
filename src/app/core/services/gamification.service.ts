import { Injectable, inject } from '@angular/core';
import { ReputationService } from './reputation.service';
import { getRankByScore, getRankByName, RankDefinition } from '../models/rank.model';

export interface Rank {
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  textColorClass?: string;
  icon: string;
  benefit: string;
  nextRankName?: string;
}

export interface RankProgress {
  currentRank: Rank;
  progressPercent: number;
  pointsToNext: number;
  isMaxLevel: boolean;
}

/**
 * Gamification facade providing C4ISR rank calculations and progression.
 */
@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  private reputation = inject(ReputationService);

  calculateProgress(score: number, explicitRankName?: string | null): RankProgress {
    const safeScore = Math.max(0, score ?? 0);
    
    let rankDef: RankDefinition;
    if (explicitRankName && explicitRankName.trim()) {
      rankDef = getRankByName(explicitRankName);
    } else {
      rankDef = getRankByScore(safeScore);
    }

    const rank: Rank = {
      name: rankDef.label,
      minScore: rankDef.minScore,
      maxScore: rankDef.maxScore,
      color: rankDef.color,
      textColorClass: rankDef.textColorClass,
      icon: rankDef.icon,
      benefit: rankDef.benefit,
      nextRankName: rankDef.nextRankName
    };

    if (!rankDef.nextRankName || safeScore >= rankDef.maxScore) {
      return {
        currentRank: rank,
        progressPercent: 100,
        pointsToNext: 0,
        isMaxLevel: true
      };
    }

    const range = Math.max(1, rankDef.maxScore - rankDef.minScore);
    const progress = safeScore - rankDef.minScore;
    const percent = Math.min(100, Math.max(0, (progress / range) * 100));

    return {
      currentRank: rank,
      progressPercent: Math.round(percent),
      pointsToNext: Math.max(0, rankDef.maxScore - safeScore + 1),
      isMaxLevel: false
    };
  }

  getRank(score: number, explicitRankName?: string | null): Rank {
    return this.calculateProgress(score, explicitRankName).currentRank;
  }
}
