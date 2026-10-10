import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Logger } from '../utils/logger';

export type WeatherAlertSeverity = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface WeatherCondition {
  temperature: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  hailRisk: boolean;
  severity: WeatherAlertSeverity;
  alertTitle: string;
  description: string;
  isDegraded: boolean;
  updatedAt: string;
}

export const DEFAULT_WEATHER_STATE: WeatherCondition = {
  temperature: 20,
  precipitation: 0,
  windSpeed: 10,
  hailRisk: false,
  severity: 'GREEN',
  alertTitle: 'Condiciones Normales',
  description: 'Sin alertas meteorológicas vigentes para Marcos Paz.',
  isDegraded: false,
  updatedAt: new Date().toISOString()
};

/**
 * Service for Servicio Meteorológico Nacional (SMN) early warnings for Marcos Paz / Cuenca Matanza-Riachuelo / Reconquista.
 * Resilient against network drops, malformed JSON, and server errors.
 */
@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private platformId = inject(PLATFORM_ID);

  public currentWeather = signal<WeatherCondition>(DEFAULT_WEATHER_STATE);
  public isLoading = signal<boolean>(false);
  public isOfflineMode = signal<boolean>(false);

  private readonly SMN_API_URL = 'https://api.smn.gob.ar/v1/weather/warnings';
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 8000;

  constructor() {}

  /**
   * Classifies meteorological risk based on precipitation, wind speed, and hail indicators.
   * Handles NaN, null, and Infinity cleanly.
   */
  classifySevereWeather(
    precipMmPerHour: number | null | undefined,
    windKmPerHour: number | null | undefined,
    hasHail: boolean | null | undefined
  ): { severity: WeatherAlertSeverity; title: string; description: string } {
    const safePrecip = (typeof precipMmPerHour === 'number' && !isNaN(precipMmPerHour) && isFinite(precipMmPerHour))
      ? Math.max(0, precipMmPerHour)
      : 0;

    const safeWind = (typeof windKmPerHour === 'number' && !isNaN(windKmPerHour) && isFinite(windKmPerHour))
      ? Math.max(0, windKmPerHour)
      : 0;

    const safeHail = Boolean(hasHail);

    // Extreme rainfall or storm (El Niño phenomenon / Inundaciones Marcos Paz)
    if (safePrecip >= 100 || safeWind >= 100 || (safePrecip >= 70 && safeHail)) {
      return {
        severity: 'RED',
        title: 'ALERTA ROJA: Tormenta Extrema e Inundación Inminente',
        description: `Precipitación severa (${safePrecip} mm/h) y ráfagas de ${safeWind} km/h. Evacuación preventiva en zonas ribereñas.`
      };
    }

    if (safePrecip >= 50 || safeWind >= 70 || safeHail) {
      return {
        severity: 'ORANGE',
        title: 'ALERTA NARANJA: Tormentas Fuertes / Riesgo de Anegamiento',
        description: `Precipitaciones intensas (${safePrecip} mm/h), ráfagas de ${safeWind} km/h${safeHail ? ' con probable caída de granizo' : ''}.`
      };
    }

    if (safePrecip >= 20 || safeWind >= 45) {
      return {
        severity: 'YELLOW',
        title: 'ALERTA AMARILLA: Fenómenos Meteorológicos con Capacidad de Daño',
        description: `Lluvias persistentes (${safePrecip} mm/h) y vientos moderados a fuertes.`
      };
    }

    return {
      severity: 'GREEN',
      title: 'Condiciones Normales',
      description: 'Sin fenómenos meteorológicos de riesgo en Marcos Paz.'
    };
  }

  /**
   * Safely parses raw SMN response string or payload.
   * Returns a sanitized WeatherCondition without throwing.
   */
  parseSmnPayload(raw: any): WeatherCondition {
    try {
      let data = raw;
      if (typeof raw === 'string') {
        data = JSON.parse(raw);
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Payload no es un objeto válido');
      }

      const rawTemp = Number(data.temperature ?? data.temp);
      const rawPrecip = Number(data.precipitation ?? data.precip ?? data.rain);
      const rawWind = Number(data.windSpeed ?? data.wind ?? data.wind_speed);
      const rawHail = Boolean(data.hailRisk || data.hail || data.granizo);

      const temp = (!isNaN(rawTemp) && isFinite(rawTemp)) ? rawTemp : 20;
      const precip = (!isNaN(rawPrecip) && isFinite(rawPrecip)) ? rawPrecip : 0;
      const wind = (!isNaN(rawWind) && isFinite(rawWind)) ? rawWind : 10;

      const classification = this.classifySevereWeather(precip, wind, rawHail);

      return {
        temperature: temp,
        precipitation: precip,
        windSpeed: wind,
        hailRisk: rawHail,
        severity: classification.severity,
        alertTitle: classification.title,
        description: classification.description,
        isDegraded: false,
        updatedAt: new Date().toISOString()
      };
    } catch (e) {
      Logger.warn('[WeatherService] Error parseando payload SMN, aplicando modo degradado:', e);
      return {
        ...DEFAULT_WEATHER_STATE,
        isDegraded: true,
        alertTitle: 'Datos SMN Degradados',
        description: 'No se pudo procesar la telemetría oficial. Manteniendo valores seguros de contingencia.'
      };
    }
  }

  /**
   * Fetches alerts from SMN with timeout, retry backoff, and graceful fallback.
   */
  async fetchAlerts(customFetchFn?: (url: string, init?: any) => Promise<Response>): Promise<WeatherCondition> {
    this.isLoading.set(true);
    let attempts = 0;
    const fetchImpl = customFetchFn || (typeof fetch !== 'undefined' ? fetch.bind(window) : null);

    if (!fetchImpl) {
      this.isLoading.set(false);
      return this.currentWeather();
    }

    while (attempts < this.MAX_RETRIES) {
      attempts++;
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), this.TIMEOUT_MS) : null;

        const response = await fetchImpl(this.SMN_API_URL, {
          signal: controller?.signal
        } as any);

        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }

        const json = await response.json();
        const parsed = this.parseSmnPayload(json);
        this.currentWeather.set(parsed);
        this.isOfflineMode.set(false);
        this.isLoading.set(false);
        return parsed;
      } catch (err) {
        Logger.warn(`[WeatherService] Intento ${attempts}/${this.MAX_RETRIES} fallido:`, err);
        if (attempts >= this.MAX_RETRIES) {
          break;
        }
        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 100));
      }
    }

    // Fallback mode
    const degradedState: WeatherCondition = {
      ...this.currentWeather(),
      isDegraded: true,
      alertTitle: 'Servicio SMN No Disponible',
      description: 'Operando con última observación registrada en memoria.'
    };
    this.currentWeather.set(degradedState);
    this.isOfflineMode.set(true);
    this.isLoading.set(false);
    return degradedState;
  }
}
