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
  // SECURITY - CRITICAL
  [ReportType.SOS]: {
    type: ReportType.SOS,
    label: 'SOS / Pánico',
    icon: '🚨',
    description: 'Emergencia inmediata - Activar alerta de pánico',
    category: 'EMERGENCY',
    requiresPhoto: false,
    requiresDescription: false
  },
  [ReportType.ROBO]: {
    type: ReportType.ROBO,
    label: 'Robo en Proceso',
    icon: '🔴',
    description: 'Robo o asalto en curso',
    category: 'SECURITY',
    requiresPhoto: false, // Dangerous to take photo
    requiresDescription: false
  },
  [ReportType.DELITO_PROCESO]: {
    type: ReportType.DELITO_PROCESO,
    label: 'Delito en Proceso',
    icon: '🚔',
    description: 'Entraderas, robos a mano armada, venta de estupefacientes',
    category: 'SECURITY',
    requiresPhoto: false, // Dangerous
    requiresDescription: true // Important details
  },
  [ReportType.ACTIVIDAD_SOSPECHOSA]: {
    type: ReportType.ACTIVIDAD_SOSPECHOSA,
    label: 'Actividad Sospechosa',
    icon: '🚗',
    description: 'Vehículos o personas merodeando de forma sospechosa',
    category: 'SECURITY',
    requiresPhoto: false,
    requiresDescription: true
  },
  [ReportType.ACTIVIDAD_DELICTIVA]: {
    type: ReportType.ACTIVIDAD_DELICTIVA,
    label: 'Actividad Delictiva / Emergencia Crítica',
    icon: '⚠️',
    description: 'Venta de estupefacientes, entraderas, vandalismo o situaciones de alto riesgo',
    category: 'SECURITY',
    requiresPhoto: false, // Optional but risky
    requiresDescription: true // Important to describe what's happening
  },
  [ReportType.VANDALISMO]: {
    type: ReportType.VANDALISMO,
    label: 'Vandalismo',
    icon: '🔨',
    description: 'Daño a propiedad pública o privada',
    category: 'SECURITY',
    requiresPhoto: true, // Evidence needed
    requiresDescription: false
  },

  // EMERGENCY
  [ReportType.INCENDIO]: {
    type: ReportType.INCENDIO,
    label: 'Incendio',
    icon: '🔥',
    description: 'Fuego o incendio activo',
    category: 'EMERGENCY',
    requiresPhoto: false,
    requiresDescription: false
  },
  [ReportType.EMERGENCIA_MEDICA]: {
    type: ReportType.EMERGENCIA_MEDICA,
    label: 'Emergencia Médica',
    icon: '🚑',
    description: 'Persona herida o necesita atención médica urgente',
    category: 'EMERGENCY',
    requiresPhoto: false,
    requiresDescription: false
  },
  [ReportType.ACCIDENTE]: {
    type: ReportType.ACCIDENTE,
    label: 'Accidente de Tránsito',
    icon: '🚗💥',
    description: 'Accidente vehicular',
    category: 'EMERGENCY',
    requiresPhoto: false,
    requiresDescription: false
  },

  // SERVICES
  [ReportType.CORTE_DE_LUZ]: {
    type: ReportType.CORTE_DE_LUZ,
    label: 'Corte de Luz',
    icon: '💡',
    description: 'Corte de energía en la zona',
    category: 'SERVICE',
    requiresPhoto: false,
    requiresDescription: false
  },
  [ReportType.LUMINARIA_ROTA]: {
    type: ReportType.LUMINARIA_ROTA,
    label: 'Luminaria Rota',
    icon: '🔦',
    description: 'Luz de calle apagada o rota',
    category: 'SERVICE',
    requiresPhoto: true, // To identify which one
    requiresDescription: false
  },
  [ReportType.BACHE]: {
    type: ReportType.BACHE,
    label: 'Bache',
    icon: '🕳️',
    description: 'Pozo o daño en el asfalto',
    category: 'SERVICE',
    requiresPhoto: true, // Evidence required
    requiresDescription: false
  },
  [ReportType.BASURA]: {
    type: ReportType.BASURA,
    label: 'Basura / Escombro',
    icon: '🗑️',
    description: 'Acumulación de residuos',
    category: 'SERVICE',
    requiresPhoto: true, // Evidence required
    requiresDescription: false
  },
  [ReportType.PELIGRO_VIAL]: {
    type: ReportType.PELIGRO_VIAL,
    label: 'Peligro Vial',
    icon: '🚧',
    description: 'Baches, cables caídos, obstrucciones, autos abandonados',
    category: 'SERVICE',
    requiresPhoto: true,
    requiresDescription: true
  },
  [ReportType.PELIGRO_VIAL_OBSTRUCCION]: {
    type: ReportType.PELIGRO_VIAL_OBSTRUCCION,
    label: 'Obstrucción de Tránsito',
    icon: '🚫🚗',
    description: 'Vehículo bloqueando cochera o rampa',
    category: 'SERVICE',
    requiresPhoto: true,
    requiresDescription: false
  },
  [ReportType.RIESGO_VIDA]: {
    type: ReportType.RIESGO_VIDA,
    label: 'RIESGO DE VIDA',
    icon: '🆘',
    description: 'Crisis de salud mental o intentos de suicidio',
    category: 'EMERGENCY',
    requiresPhoto: false,
    requiresDescription: true
  }
};

export const REPORT_GROUPS = {
  EMERGENCY: [
    REPORT_STRATEGIES[ReportType.SOS],
    REPORT_STRATEGIES[ReportType.ROBO],
    REPORT_STRATEGIES[ReportType.DELITO_PROCESO],
    REPORT_STRATEGIES[ReportType.ACTIVIDAD_DELICTIVA],
    REPORT_STRATEGIES[ReportType.INCENDIO],
    REPORT_STRATEGIES[ReportType.EMERGENCIA_MEDICA],
    REPORT_STRATEGIES[ReportType.ACCIDENTE],
    REPORT_STRATEGIES[ReportType.RIESGO_VIDA]
  ],
  SECURITY: [
    REPORT_STRATEGIES[ReportType.ACTIVIDAD_SOSPECHOSA],
    REPORT_STRATEGIES[ReportType.VANDALISMO]
  ],
  SERVICE: [
    REPORT_STRATEGIES[ReportType.CORTE_DE_LUZ],
    REPORT_STRATEGIES[ReportType.PELIGRO_VIAL],
    REPORT_STRATEGIES[ReportType.PELIGRO_VIAL_OBSTRUCCION],
    REPORT_STRATEGIES[ReportType.LUMINARIA_ROTA],
    REPORT_STRATEGIES[ReportType.BASURA]
  ]
};
