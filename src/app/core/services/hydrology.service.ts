import { Injectable, signal } from '@angular/core';

export type RiverStatus = 'NORMAL' | 'PRE_ALERTA' | 'ALERTA' | 'CRITICO';

export interface BasinStation {
  id: string;
  name: string;
  riverName: string;
  currentLevelMeters: number | null;
  warningThresholdMeters: number;
  criticalThresholdMeters: number;
  status: RiverStatus;
  statusLabel: string;
  soilSaturationPercent: number; // 0 - 100%
  lastReadingTimestamp: string;
}

export const BASIN_STATIONS_CONFIG: BasinStation[] = [
  {
    id: 'st-la-paja',
    name: 'Estación Telemétrica La Paja',
    riverName: 'Arroyo La Paja',
    currentLevelMeters: 1.8,
    warningThresholdMeters: 3.5,
    criticalThresholdMeters: 4.5,
    status: 'NORMAL',
    statusLabel: 'Nivel Estable',
    soilSaturationPercent: 45,
    lastReadingTimestamp: new Date().toISOString()
  },
  {
    id: 'st-el-durazno',
    name: 'Estación Hidrológica El Durazno',
    riverName: 'Arroyo El Durazno',
    currentLevelMeters: 0.9,
    warningThresholdMeters: 1.5,
    criticalThresholdMeters: 2.0,
    status: 'NORMAL',
    statusLabel: 'Nivel Estable',
    soilSaturationPercent: 40,
    lastReadingTimestamp: new Date().toISOString()
  },
  {
    id: 'st-dique-acosta',
    name: 'Estación Vertedero Mariano Acosta',
    riverName: 'Dique Mariano Acosta',
    currentLevelMeters: 2.5,
    warningThresholdMeters: 4.0,
    criticalThresholdMeters: 5.0,
    status: 'NORMAL',
    statusLabel: 'Nivel Estable',
    soilSaturationPercent: 50,
    lastReadingTimestamp: new Date().toISOString()
  }
];

@Injectable({
  providedIn: 'root'
})
export class HydrologyService {
  public stations = signal<BasinStation[]>(BASIN_STATIONS_CONFIG);
  public overallCritical = signal<boolean>(false);

  constructor() {}

  /**
   * Evaluates station level status against hydrodynamic safety thresholds.
   * Handles negative, null, NaN, and Infinity safely.
   */
  evaluateLevel(currentLevel: number | null | undefined, warningThreshold: number, criticalThreshold: number): {
    status: RiverStatus;
    label: string;
    safeLevel: number | null;
  } {
    if (currentLevel === null || currentLevel === undefined || isNaN(currentLevel) || !isFinite(currentLevel)) {
      return {
        status: 'NORMAL',
        label: 'Sensor Desconectado / Datos Desconocidos',
        safeLevel: null
      };
    }

    // Negative readings clamped to 0 (dry bed or sensor baseline offset)
    const normalized = Math.max(0, currentLevel);

    if (normalized >= criticalThreshold) {
      return {
        status: 'CRITICO',
        label: 'DESBORDE INMINENTE / EVACUACIÓN',
        safeLevel: normalized
      };
    }

    if (normalized >= warningThreshold) {
      return {
        status: 'ALERTA',
        label: 'Nivel Alto en Alerta',
        safeLevel: normalized
      };
    }

    if (normalized >= warningThreshold * 0.75) {
      return {
        status: 'PRE_ALERTA',
        label: 'Creciente Moderada',
        safeLevel: normalized
      };
    }

    return {
      status: 'NORMAL',
      label: 'Nivel Estable',
      safeLevel: normalized
    };
  }

  /**
   * Calculates soil saturation risk.
   * At 100% saturation, runoff is instantaneous (Alto Riesgo Fenómeno El Niño).
   */
  evaluateSoilSaturation(saturationPercent: number | null | undefined): {
    isCritical: boolean;
    label: string;
    percent: number;
  } {
    if (saturationPercent === null || saturationPercent === undefined || isNaN(saturationPercent) || !isFinite(saturationPercent)) {
      return { isCritical: false, label: 'Desconocido', percent: 0 };
    }

    const safePercent = Math.min(100, Math.max(0, saturationPercent));

    if (safePercent >= 100) {
      return {
        isCritical: true,
        label: 'SATURACIÓN TOTAL (100%): Riego extremo de anegamiento',
        percent: 100
      };
    }

    if (safePercent >= 85) {
      return {
        isCritical: false,
        label: 'Saturación Severa (>85%): Capacidad de absorción mínima',
        percent: safePercent
      };
    }

    return {
      isCritical: false,
      label: 'Saturación Normal / Capacidad de drenaje disponible',
      percent: safePercent
    };
  }

  /**
   * Updates telemetric reading for a given station.
   */
  updateStationReading(stationId: string, levelMeters: number, soilSaturationPercent = 50): void {
    this.stations.update(list =>
      list.map(st => {
        if (st.id !== stationId) return st;

        const evalResult = this.evaluateLevel(levelMeters, st.warningThresholdMeters, st.criticalThresholdMeters);
        const satResult = this.evaluateSoilSaturation(soilSaturationPercent);

        return {
          ...st,
          currentLevelMeters: evalResult.safeLevel,
          status: evalResult.status,
          statusLabel: evalResult.label,
          soilSaturationPercent: satResult.percent,
          lastReadingTimestamp: new Date().toISOString()
        };
      })
    );

    // Recompute overall threat
    const hasCritical = this.stations().some(s => s.status === 'CRITICO' || s.soilSaturationPercent >= 100);
    this.overallCritical.set(hasCritical);
  }
}
