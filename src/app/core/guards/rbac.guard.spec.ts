import { TestBed } from '@angular/core/testing';
import { rbacGuard } from './rbac.guard';
import { AuthService } from '../services/auth.service';
import { Router, UrlTree } from '@angular/router';

describe('rbacGuard (Role-Based Access Control Security)', () => {
  let mockAuth: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuth = {
      waitForAuthInit: jest.fn().mockResolvedValue(undefined),
      currentUser: jest.fn(),
      profile: jest.fn(),
      setReturnUrl: jest.fn()
    };

    mockRouter = {
      createUrlTree: jest.fn().mockImplementation((commands: any[]) => ({ tree: commands.join('/') } as unknown as UrlTree))
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('allows access when user has verified role "admin"', async () => {
    mockAuth.currentUser.mockReturnValue({ id: 'adm-1', user_metadata: { role: 'admin' } });
    mockAuth.profile.mockReturnValue({ id: 'adm-1', role: 'admin' });

    const result = await TestBed.runInInjectionContext(() =>
      rbacGuard({} as any, { url: '/admin/dashboard' } as any)
    );

    expect(result).toBe(true);
  });

  it('allows access when user has verified role "super_admin"', async () => {
    mockAuth.currentUser.mockReturnValue({ id: 'sup-1', user_metadata: { role: 'super_admin' } });
    mockAuth.profile.mockReturnValue({ id: 'sup-1', role: 'super_admin' });

    const result = await TestBed.runInInjectionContext(() =>
      rbacGuard({} as any, { url: '/admin/dashboard' } as any)
    );

    expect(result).toBe(true);
  });

  it('blocks civilian user and redirects to /inicio', async () => {
    mockAuth.currentUser.mockReturnValue({ id: 'civ-1', user_metadata: { role: 'civilian' } });
    mockAuth.profile.mockReturnValue({ id: 'civ-1', role: 'civilian' });

    const result = await TestBed.runInInjectionContext(() =>
      rbacGuard({} as any, { url: '/admin/dashboard' } as any)
    );

    expect(result).not.toBe(true);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/inicio']);
  });

  it('blocks unauthenticated user (role null / no session) and redirects to login with returnUrl', async () => {
    mockAuth.currentUser.mockReturnValue(null);
    mockAuth.profile.mockReturnValue(null);

    const result = await TestBed.runInInjectionContext(() =>
      rbacGuard({} as any, { url: '/admin/dashboard' } as any)
    );

    expect(result).not.toBe(true);
    expect(mockAuth.setReturnUrl).toHaveBeenCalledWith('/admin/dashboard');
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], { queryParams: { returnUrl: '/admin/dashboard' } });
  });

  it('blocks user if localStorage is tampered with fake role but auth returns non-admin', async () => {
    // Attacker modifies localStorage in browser
    localStorage.setItem('role', 'admin');
    localStorage.setItem('sb-auth-token', JSON.stringify({ role: 'admin' }));

    // But server-verified AuthService profile states civilian
    mockAuth.currentUser.mockReturnValue({ id: 'att-1', user_metadata: { role: 'citizen' } });
    mockAuth.profile.mockReturnValue({ id: 'att-1', role: 'citizen' });

    const result = await TestBed.runInInjectionContext(() =>
      rbacGuard({} as any, { url: '/admin/dashboard' } as any)
    );

    expect(result).not.toBe(true);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/inicio']);
  });
});
