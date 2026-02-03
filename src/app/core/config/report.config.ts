import { ReportType } from '../models';

export type ReportCategory = 'SECURITY' | 'SERVICE' | 'EMERGENCY';

export interface ReportStrategy {
  type: ReportType;
  label: string;
  icon: string; // Emoji
  description: string;
  category: ReportCategory;
  requiresPhoto: boolean;
  requiresDescription: boolean;
}

export const REPORT_STRATEGIES: Record<string, ReportStrategy> = {
  // SECURITY
  [ReportType.SUSPICIOUS_VEHICLE]: {
    type: ReportType.SUSPICIOUS_VEHICLE,
    label: 'Auto Sospechoso',
    icon: '🚗',
    description: 'Vehículo desconocido merodeando',
    category: 'SECURITY',
    requiresPhoto: false, // Optional, can be quick
    requiresDescription: false
  },
  [ReportType.FIGHT]: {
    type: ReportType.FIGHT,
    label: 'Pelea / Riña',
    icon: '👊',
    description: 'Conflicto violento en vía pública',
    category: 'SECURITY',
    requiresPhoto: false, // Risky to take photo
    requiresDescription: false
  },
  [ReportType.VANDALISM]: {
    type: ReportType.VANDALISM,
    label: 'Vandalismo',
    icon: '🔨',
    description: 'Daño a propiedad pública o privada',
    category: 'SECURITY',
    requiresPhoto: true, // Evidence needed ideally
    requiresDescription: false
  },

  // SERVICES
  [ReportType.POWER_OUTAGE]: {
    type: ReportType.POWER_OUTAGE,
    label: 'Corte de Luz',
    icon: '💡',
    description: 'Corte de energía en la zona',
    category: 'SERVICE',
    requiresPhoto: false, // Implicit "it's dark"
    requiresDescription: false
  },
  [ReportType.STREETLIGHT_OFF]: {
    type: ReportType.STREETLIGHT_OFF,
    label: 'Luminaria Rota',
    icon: '🔦',
    description: 'Luz de calle apagada o rota',
    category: 'SERVICE',
    requiresPhoto: true, // To identify which one
    requiresDescription: false
  },
  [ReportType.POTHOLE]: {
    type: ReportType.POTHOLE,
    label: 'Bache',
    icon: '🕳️',
    description: 'Pozo o daño en el asfalto',
    category: 'SERVICE',
    requiresPhoto: true, // Evidence required
    requiresDescription: false
  },
  [ReportType.TRASH]: {
    type: ReportType.TRASH,
    label: 'Basura / Escombro',
    icon: '🗑️',
    description: 'Acumulación de residuos',
    category: 'SERVICE',
    requiresPhoto: true, // Evidence required
    requiresDescription: false
  }
};

export const REPORT_GROUPS = {
  SECURITY: [
    REPORT_STRATEGIES[ReportType.SUSPICIOUS_VEHICLE],
    REPORT_STRATEGIES[ReportType.FIGHT],
    REPORT_STRATEGIES[ReportType.VANDALISM]
  ],
  SERVICE: [
    REPORT_STRATEGIES[ReportType.POWER_OUTAGE],
    REPORT_STRATEGIES[ReportType.POTHOLE],
    REPORT_STRATEGIES[ReportType.STREETLIGHT_OFF],
    REPORT_STRATEGIES[ReportType.TRASH]
  ]
};
