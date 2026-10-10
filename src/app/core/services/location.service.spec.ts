import { TestBed } from '@angular/core/testing';
import { LocationService, MARCOS_PAZ_DEFAULT, createMarcosPazPosition } from './location.service';
import { PLATFORM_ID } from '@angular/core';

describe('LocationService (Tactical Geopositioning)', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LocationService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    service = TestBed.inject(LocationService);
  });

  describe('Initial State', () => {
    it('seeds immediate, deterministic coordinates pointing to Marcos Paz operational center', () => {
      const pos = service.currentPosition();
      expect(pos).toBeTruthy();
      expect(pos.coords.latitude).toBeCloseTo(MARCOS_PAZ_DEFAULT.latitude, 4);
      expect(pos.coords.longitude).toBeCloseTo(MARCOS_PAZ_DEFAULT.longitude, 4);
    });
  });

  describe('createMarcosPazPosition', () => {
    it('generates a valid, complete Position object with valid accuracy and timestamps', () => {
      const pos = createMarcosPazPosition();
      expect(pos.coords.latitude).toBe(MARCOS_PAZ_DEFAULT.latitude);
      expect(pos.coords.longitude).toBe(MARCOS_PAZ_DEFAULT.longitude);
      expect(pos.coords.accuracy).toBeGreaterThan(0);
      expect(pos.timestamp).toBeGreaterThan(0);
    });
  });

  describe('getCurrentPosition with Failures & Hostile Conditions', () => {
    it('falls back guaranteed to Marcos Paz when web geolocation throws or denies permission', async () => {
      // Mock navigator.geolocation failing with PermissionDenied
      const mockGeolocation = {
        getCurrentPosition: (success: any, error: any) => {
          error({ code: 1, message: 'User denied Geolocation' });
        }
      };

      Object.defineProperty(window.navigator, 'geolocation', {
        value: mockGeolocation,
        configurable: true,
        writable: true
      });

      const position = await service.getCurrentPosition();
      expect(position).toBeTruthy();
      expect(position.coords.latitude).toBeCloseTo(MARCOS_PAZ_DEFAULT.latitude, 4);
      expect(position.coords.longitude).toBeCloseTo(MARCOS_PAZ_DEFAULT.longitude, 4);
    });

    it('falls back guaranteed to Marcos Paz on timeout error', async () => {
      const mockGeolocation = {
        getCurrentPosition: (success: any, error: any) => {
          error({ code: 3, message: 'Timeout expired' });
        }
      };

      Object.defineProperty(window.navigator, 'geolocation', {
        value: mockGeolocation,
        configurable: true,
        writable: true
      });

      const position = await service.getCurrentPosition();
      expect(position).toBeTruthy();
      expect(position.coords.latitude).toBeCloseTo(MARCOS_PAZ_DEFAULT.latitude, 4);
    });
  });

  describe('Manual Override', () => {
    it('allows setting manual position override for emergency dispatch', () => {
      const customPos = {
        timestamp: Date.now(),
        coords: {
          latitude: -34.7800,
          longitude: -58.8400,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        }
      } as any;

      service.setManualPosition(customPos);
      expect(service.manualPosition()).toEqual(customPos);
      expect(service.currentPosition().coords.latitude).toBe(-34.7800);

      service.clearManualPosition();
      expect(service.manualPosition()).toBeNull();
    });
  });
});
