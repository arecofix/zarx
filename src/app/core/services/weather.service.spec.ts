import { TestBed } from '@angular/core/testing';
import { WeatherService, DEFAULT_WEATHER_STATE } from './weather.service';
import { PLATFORM_ID } from '@angular/core';

describe('WeatherService (SMN Early Warning Domain)', () => {
  let service: WeatherService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WeatherService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    service = TestBed.inject(WeatherService);
  });

  describe('classifySevereWeather', () => {
    it('classifies RED ALERT for extreme precipitation (>=100 mm/h) or hurricane wind (>=100 km/h)', () => {
      const redRain = service.classifySevereWeather(120, 40, false);
      expect(redRain.severity).toBe('RED');
      expect(redRain.title).toContain('ALERTA ROJA');

      const redWind = service.classifySevereWeather(10, 115, false);
      expect(redWind.severity).toBe('RED');

      const redCombo = service.classifySevereWeather(75, 50, true);
      expect(redCombo.severity).toBe('RED');
    });

    it('classifies ORANGE ALERT for heavy storms, severe wind or hail', () => {
      const orangeRain = service.classifySevereWeather(60, 20, false);
      expect(orangeRain.severity).toBe('ORANGE');

      const orangeWind = service.classifySevereWeather(10, 75, false);
      expect(orangeWind.severity).toBe('ORANGE');

      const orangeHail = service.classifySevereWeather(15, 20, true);
      expect(orangeHail.severity).toBe('ORANGE');
    });

    it('classifies YELLOW ALERT for moderate risk', () => {
      const yellow = service.classifySevereWeather(25, 20, false);
      expect(yellow.severity).toBe('YELLOW');
      expect(yellow.title).toContain('ALERTA AMARILLA');
    });

    it('classifies GREEN ALERT for normal conditions', () => {
      const normal = service.classifySevereWeather(0, 10, false);
      expect(normal.severity).toBe('GREEN');
      expect(normal.title).toBe('Condiciones Normales');
    });

    it('handles hostile inputs (NaN, null, undefined, Infinity, negatives) cleanly without throwing', () => {
      const hostile1 = service.classifySevereWeather(NaN, null, undefined);
      expect(hostile1.severity).toBe('GREEN');

      const hostile2 = service.classifySevereWeather(Infinity, -50, null);
      expect(hostile2.severity).toBe('GREEN');

      const hostile3 = service.classifySevereWeather(-100, -200, false);
      expect(hostile3.severity).toBe('GREEN');
    });
  });

  describe('parseSmnPayload', () => {
    it('parses valid SMN JSON object successfully', () => {
      const payload = {
        temperature: 24.5,
        precipitation: 55,
        windSpeed: 45,
        hailRisk: false
      };
      const result = service.parseSmnPayload(payload);
      expect(result.temperature).toBe(24.5);
      expect(result.precipitation).toBe(55);
      expect(result.severity).toBe('ORANGE');
      expect(result.isDegraded).toBe(false);
    });

    it('handles truncated or corrupt JSON string gracefully by switching to degraded mode', () => {
      const truncatedJson = '{"temperature": 25, "precip": 80, "wind": ';
      const result = service.parseSmnPayload(truncatedJson);
      expect(result.isDegraded).toBe(true);
      expect(result.alertTitle).toContain('Degradados');
    });

    it('handles null, non-object, or empty payloads without crashing', () => {
      const nullResult = service.parseSmnPayload(null);
      expect(nullResult.isDegraded).toBe(true);

      const stringResult = service.parseSmnPayload('INVALID_NON_JSON_DATA');
      expect(stringResult.isDegraded).toBe(true);
    });
  });

  describe('fetchAlerts', () => {
    it('successfully updates signals when HTTP request succeeds', async () => {
      const mockResponse = new Response(JSON.stringify({
        temperature: 22,
        precipitation: 110,
        windSpeed: 60,
        hailRisk: false
      }), { status: 200 });

      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      const result = await service.fetchAlerts(mockFetch);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.severity).toBe('RED');
      expect(service.isOfflineMode()).toBe(false);
      expect(service.isLoading()).toBe(false);
    });

    it('retries with backoff upon HTTP 500 error and falls back gracefully to offline state', async () => {
      const errorResponse = new Response('Internal Server Error', { status: 500 });
      const mockFetch = jest.fn().mockResolvedValue(errorResponse);

      const result = await service.fetchAlerts(mockFetch);

      // Should have attempted 3 retries
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.isDegraded).toBe(true);
      expect(service.isOfflineMode()).toBe(true);
      expect(service.isLoading()).toBe(false);
    });
  });
});
