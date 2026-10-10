import { TestBed } from '@angular/core/testing';
import { HydrologyService, BASIN_STATIONS_CONFIG } from './hydrology.service';

describe('HydrologyService (Basin Stations & Soil Saturation)', () => {
  let service: HydrologyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HydrologyService]
    });
    service = TestBed.inject(HydrologyService);
  });

  describe('evaluateLevel', () => {
    it('triggers CRITICAL when Arroyo La Paja reaches or exceeds critical threshold (4.5m)', () => {
      const result = service.evaluateLevel(4.6, 3.5, 4.5);
      expect(result.status).toBe('CRITICO');
      expect(result.label).toContain('DESBORDE INMINENTE');
      expect(result.safeLevel).toBe(4.6);
    });

    it('triggers ALERTA when Arroyo El Durazno reaches warning threshold (1.5m to 2.0m)', () => {
      const result = service.evaluateLevel(1.8, 1.5, 2.0);
      expect(result.status).toBe('ALERTA');
      expect(result.label).toContain('Alerta');
    });

    it('triggers CRITICO when Dique Mariano Acosta reaches 5.0m', () => {
      const result = service.evaluateLevel(5.2, 4.0, 5.0);
      expect(result.status).toBe('CRITICO');
    });

    it('handles negative levels gracefully by clamping to zero', () => {
      const result = service.evaluateLevel(-2.5, 3.5, 4.5);
      expect(result.status).toBe('NORMAL');
      expect(result.safeLevel).toBe(0);
    });

    it('handles NaN, Infinity, null, and undefined without throwing', () => {
      const nanRes = service.evaluateLevel(NaN, 3.5, 4.5);
      expect(nanRes.status).toBe('NORMAL');
      expect(nanRes.safeLevel).toBeNull();

      const infRes = service.evaluateLevel(Infinity, 3.5, 4.5);
      expect(infRes.status).toBe('NORMAL');
      expect(infRes.safeLevel).toBeNull();

      const nullRes = service.evaluateLevel(null, 3.5, 4.5);
      expect(nullRes.status).toBe('NORMAL');
      expect(nullRes.safeLevel).toBeNull();
    });
  });

  describe('evaluateSoilSaturation', () => {
    it('triggers isCritical when soil saturation reaches 100% (zero infiltration capacity)', () => {
      const result = service.evaluateSoilSaturation(100);
      expect(result.isCritical).toBe(true);
      expect(result.percent).toBe(100);
      expect(result.label).toContain('SATURACIÓN TOTAL');
    });

    it('clamps values above 100% to exactly 100%', () => {
      const result = service.evaluateSoilSaturation(150);
      expect(result.isCritical).toBe(true);
      expect(result.percent).toBe(100);
    });

    it('handles NaN or null saturation safely', () => {
      const result = service.evaluateSoilSaturation(NaN);
      expect(result.isCritical).toBe(false);
      expect(result.percent).toBe(0);
    });
  });

  describe('updateStationReading', () => {
    it('updates station and recomputes overallCritical flag', () => {
      expect(service.overallCritical()).toBe(false);

      // Trigger critical surge on La Paja
      service.updateStationReading('st-la-paja', 4.8, 100);

      const updatedLaPaja = service.stations().find(s => s.id === 'st-la-paja');
      expect(updatedLaPaja?.status).toBe('CRITICO');
      expect(updatedLaPaja?.soilSaturationPercent).toBe(100);
      expect(service.overallCritical()).toBe(true);
    });
  });
});
