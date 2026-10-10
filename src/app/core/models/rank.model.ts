export enum AgentRank {
  CADETE = 'Cadete',
  AGENTE = 'Agente',
  OFICIAL = 'Oficial',
  COMANDANTE = 'Comandante',
  DIRECTOR = 'Director C4ISR'
}

export interface RankDefinition {
  rank: AgentRank | string;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
  textColorClass: string;
  bgGradientClass: string;
  icon: string;
  benefit: string;
  nextRankName?: string;
}

export const RANK_DEFINITIONS: RankDefinition[] = [
  {
    rank: AgentRank.CADETE,
    label: 'Cadete',
    minScore: 0,
    maxScore: 299,
    color: '#94A3B8', // slate-400
    textColorClass: 'text-slate-400',
    bgGradientClass: 'from-slate-600 to-slate-400',
    icon: '🔰',
    benefit: 'Acceso básico a la red comunitaria',
    nextRankName: 'Agente'
  },
  {
    rank: AgentRank.AGENTE,
    label: 'Agente',
    minScore: 300,
    maxScore: 499,
    color: '#38BDF8', // sky-400
    textColorClass: 'text-sky-400',
    bgGradientClass: 'from-sky-600 to-sky-400',
    icon: '🛡️',
    benefit: 'Validación prioritaria de reportes',
    nextRankName: 'Oficial'
  },
  {
    rank: AgentRank.OFICIAL,
    label: 'Oficial',
    minScore: 500,
    maxScore: 799,
    color: '#34D399', // emerald-400
    textColorClass: 'text-emerald-400',
    bgGradientClass: 'from-emerald-600 to-emerald-400',
    icon: '⭐',
    benefit: 'Acceso a alertas tempranas y radio',
    nextRankName: 'Comandante'
  },
  {
    rank: AgentRank.COMANDANTE,
    label: 'Comandante',
    minScore: 800,
    maxScore: 999,
    color: '#A78BFA', // violet-400
    textColorClass: 'text-violet-400',
    bgGradientClass: 'from-violet-600 to-violet-400',
    icon: '🎖️',
    benefit: 'Coordinación táctica de cuadrantes',
    nextRankName: 'Director C4ISR'
  },
  {
    rank: AgentRank.DIRECTOR,
    label: 'Director C4ISR',
    minScore: 1000,
    maxScore: 999999,
    color: '#F59E0B', // amber-500
    textColorClass: 'text-amber-400',
    bgGradientClass: 'from-amber-600 to-amber-400',
    icon: '👑',
    benefit: 'Comando y Control Total C4ISR',
    nextRankName: undefined
  }
];

export function getRankByScore(score: number): RankDefinition {
  const safeScore = Math.max(0, score || 0);
  const found = RANK_DEFINITIONS.slice().reverse().find(def => safeScore >= def.minScore);
  return found || RANK_DEFINITIONS[0];
}

export function getRankByName(name?: string | null): RankDefinition {
  if (!name) return RANK_DEFINITIONS[0];
  const normalized = name.toLowerCase().trim();
  const found = RANK_DEFINITIONS.find(def => 
    def.rank.toLowerCase() === normalized || 
    def.label.toLowerCase() === normalized
  );
  return found || RANK_DEFINITIONS[0];
}
