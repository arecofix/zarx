import { Injectable } from '@angular/core';

export interface Rank {
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  icon: string;
  benefit: string;
  nextRankName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  
  private RANKS: Rank[] = [
    { 
      name: 'OBSERVADO', 
      minScore: 0, 
      maxScore: 300, 
      color: 'red-500', 
      icon: '👁️', 
      benefit: 'Reportes requieren doble validación',
      nextRankName: 'CIUDADANO' 
    },
    { 
      name: 'CIUDADANO', 
      minScore: 301, 
      maxScore: 700, 
      color: 'blue-400', 
      icon: '🛡️', 
      benefit: 'Acceso estándar a monitoreo',
      nextRankName: 'VIGÍA' 
    },
    { 
      name: 'VIGÍA', 
      minScore: 701, 
      maxScore: 1000, 
      color: 'emerald-400', 
      icon: '🦅', 
      benefit: 'Prioridad de Alerta + Ícono Especial',
      nextRankName: undefined
    }
  ];

  calculateProgress(score: number) {
    const rank = this.getRank(score);
    const nextRank = this.RANKS.find(r => r.name === rank.nextRankName);

    if (!nextRank) {
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
      currentRank: rank,
      progressPercent: Math.round(percent),
      pointsToNext: rank.maxScore - score + 1,
      isMaxLevel: false
    };
  }

  getRank(score: number): Rank {
    return this.RANKS.find(r => score >= r.minScore && score <= r.maxScore) || this.RANKS[0];
  }
}
