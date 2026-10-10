import { TestBed } from '@angular/core/testing';
import { ProfileService } from './profile.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AppConstants } from '../constants/app.constants';

describe('ProfileService (Ezequiel Enrico Areco & C4ISR Identity)', () => {
  let service: ProfileService;
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
      }
    };

    mockAuth = {
      currentUser: jest.fn().mockReturnValue({
        id: '9da10a3a-e000-4a5e-8671-4f4c55266dbe',
        email: 'ezequielenrico15@gmail.com',
        user_metadata: {
          full_name: 'Ezequiel Enrico areco',
          role: 'admin'
        }
      })
    };

    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AuthService, useValue: mockAuth }
      ]
    });

    service = TestBed.inject(ProfileService);
  });

  describe('generateDisplayId', () => {
    it('generates padded index display ID (e.g. ZARX-0001)', () => {
      expect(service.generateDisplayId(null, 1)).toBe('ZARX-0001');
      expect(service.generateDisplayId(null, 42)).toBe('ZARX-0042');
    });

    it('generates uppercase UUID prefix if only profileId is supplied', () => {
      expect(service.generateDisplayId('9da10a3a-e000-4a5e-8671')).toBe('ZARX-9DA10A3A');
    });

    it('falls back to ZARX-0001 if no arguments provided', () => {
      expect(service.generateDisplayId()).toBe('ZARX-0001');
    });
  });

  describe('resolveProfileDefaults (Ezequiel Enrico Areco Edge Cases)', () => {
    it('resolves Director C4ISR and ZARX-0001 when profile has role admin but missing rank and display_id', () => {
      const resolved = service.resolveProfileDefaults({
        id: '9da10a3a-e000-4a5e-8671-4f4c55266dbe',
        full_name: 'Ezequiel Enrico areco',
        role: 'admin',
        rank: undefined,
        display_id: undefined,
        avatar_url: undefined
      });

      expect(resolved.id).toBe('9da10a3a-e000-4a5e-8671-4f4c55266dbe');
      expect(resolved.full_name).toBe('Ezequiel Enrico areco');
      expect(resolved.rank).toBe('Director C4ISR');
      expect(resolved.display_id).toBe('ZARX-9DA10A3A');
      expect(resolved.avatar_url).toBe(AppConstants.ASSETS.IMAGES.AVATAR_PLACEHOLDER);
    });

    it('falls back to Cadete and default reputation for normal citizens', () => {
      const resolved = service.resolveProfileDefaults({
        id: 'usr-citizen-1',
        full_name: 'Vecino Marcos Paz',
        role: 'citizen'
      });

      expect(resolved.rank).toBe('Cadete');
      expect(resolved.reputation_score).toBe(100);
      expect(resolved.is_shadowbanned).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('returns resolved fallback even if Supabase returns 404 / null', async () => {
      mockSupabase.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' }
      });

      const profile = await service.getProfile('9da10a3a-e000-4a5e-8671-4f4c55266dbe');
      expect(profile).toBeTruthy();
      expect(profile.id).toBe('9da10a3a-e000-4a5e-8671-4f4c55266dbe');
      expect(profile.rank).toBe('Director C4ISR');
      expect(service.currentProfile()).toEqual(profile);
    });
  });
});
