import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';
import { AppConstants } from '../constants/app.constants';

describe('AuthService (Security & Session Lifecycle)', () => {
  let service: AuthService;
  let mockSupabaseService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockSupabaseService = {
      client: {
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
          onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
          signInWithPassword: jest.fn(),
          signInWithOtp: jest.fn(),
          signInWithOAuth: jest.fn(),
          signOut: jest.fn().mockResolvedValue({ error: null })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
      }
    };

    mockRouter = {
      url: '/inicio',
      navigate: jest.fn(),
      navigateByUrl: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  describe('isAdmin evaluation', () => {
    it('evaluates false when role is null or civilian', () => {
      service.profile.set({ id: 'u1', role: 'civilian' } as any);
      service.currentUser.set({ id: 'u1', user_metadata: { role: 'civilian' } } as any);
      expect(service.isAdmin()).toBe(false);

      service.profile.set(null);
      service.currentUser.set(null);
      expect(service.isAdmin()).toBe(false);
    });

    it('evaluates true when profile or metadata has admin or super_admin', () => {
      service.profile.set({ id: 'u-admin', role: 'admin' } as any);
      expect(service.isAdmin()).toBe(true);

      service.profile.set(null);
      service.currentUser.set({ id: 'u-admin', user_metadata: { role: 'admin' } } as any);
      expect(service.isAdmin()).toBe(true);

      service.currentUser.set({ id: 'u-super', user_metadata: { role: 'super_admin' } } as any);
      expect(service.isAdmin()).toBe(true);
    });

    it('does not trust arbitrary client strings that are not admin or super_admin', () => {
      service.profile.set({ id: 'u-attacker', role: 'OPERATOR_FAKE' } as any);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('Return URL Security & Validation', () => {
    it('rejects external URLs (prevent open-redirect attacks)', () => {
      expect(service.isValidReturnUrl('https://evil.com')).toBe(false);
      expect(service.isValidReturnUrl('//evil.com')).toBe(false);
      expect(service.isValidReturnUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects auth paths to prevent infinite loops', () => {
      expect(service.isValidReturnUrl('/auth/login')).toBe(false);
      expect(service.isValidReturnUrl('/auth/callback')).toBe(false);
    });

    it('accepts valid internal paths', () => {
      expect(service.isValidReturnUrl('/admin/dashboard')).toBe(true);
      expect(service.isValidReturnUrl('/mapa')).toBe(true);
      expect(service.isValidReturnUrl('/perfil')).toBe(true);
    });
  });

  describe('Session State Management', () => {
    it('clears profile and return URL on signOut', async () => {
      service.setReturnUrl('/admin/dashboard');
      service.profile.set({ id: 'u1', role: 'admin' } as any);

      await service.signOut();

      expect(mockSupabaseService.client.auth.signOut).toHaveBeenCalled();
      expect(service.getReturnUrl()).toBeNull();
    });
  });
});
