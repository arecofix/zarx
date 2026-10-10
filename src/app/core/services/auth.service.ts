import { Injectable, computed, inject, signal, effect, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { Logger } from '../utils/logger';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

import { Profile } from '../models/index';
import { AppConstants } from '../constants/app.constants';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService).client;
  private router = inject(Router);
  private injector = inject(Injector);

  private readonly RETURN_URL_KEY = 'zarx_return_url';
  private readonly LAST_VISITED_URL_KEY = 'zarx_last_visited_url';

  // Signals for Auth State
  currentUser = signal<User | null>(null);
  session = signal<Session | null>(null);
  profile = signal<Profile | null>(null);
  
  // Navigation & Redirect Signals
  private _returnUrl = signal<string | null>(null);
  private _lastVisitedUrl = signal<string | null>(null);

  // Computed Role Check (resilient to schema delays and checks metadata as well)
  isAdmin = computed(() => {
    const profileRole = this.profile()?.role;
    const metaRole = this.currentUser()?.user_metadata?.['role'];
    const adminRoles = [
      AppConstants.CONFIG.ROLES.ADMIN,
      AppConstants.CONFIG.ROLES.SUPER_ADMIN
    ];
    return adminRoles.includes(profileRole as any) || adminRoles.includes(metaRole as any);
  });

  // Initialization State
  isInitialized = signal(false);

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    try {
      // Check initial session
      const { data } = await this.supabase.auth.getSession();
      await this.updateState(data.session);

      // Listen to changes
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        await this.updateState(session);
        this.handleNavigation(event);
      });

      // Re-validate on resume (Mobile Data Clear Fix)
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible') {
            const { data } = await this.supabase.auth.getSession();
            if (!data.session && this.currentUser()) {
              // Session invalid but user in memory -> Force Logout
              this.handleNavigation('SIGNED_OUT');
              await this.updateState(null);
            }
          }
        });
      }
    } catch (e) {
      Logger.error('[Auth] initAuth error:', e);
    } finally {
      this.isInitialized.set(true);
    }
  }

  // Helper to wait for auth initialization
  async waitForAuthInit(): Promise<void> {
    if (this.isInitialized()) return;
    
    return new Promise(resolve => {
       const effectRef = effect(() => {
          if (this.isInitialized()) {
             resolve();
             effectRef.destroy();
          }
       }, { injector: this.injector });
    });
  }

  private async updateState(session: Session | null) {
    this.session.set(session);
    this.currentUser.set(session?.user ?? null);
    if (session?.user) {
      await this.fetchProfile(session.user.id);
    } else {
      this.profile.set(null);
    }
  }

  async fetchProfile(userId: string): Promise<Profile | null> {
    try {
      const { data } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        this.profile.set(data as Profile);
        return data as Profile;
      }

      // Self-healing: if user exists in auth but record is missing in zarx.profiles
      const user = this.currentUser();
      if (user && user.id === userId) {
        const metadata = user.user_metadata || {};
        const fallbackProfile: Partial<Profile> = {
          id: user.id,
          email: user.email,
          full_name: metadata['full_name'] || metadata['name'] || user.email?.split('@')[0],
          avatar_url: metadata['avatar_url'] || metadata['picture'] || '',
          role: metadata['role'] || AppConstants.CONFIG.ROLES.CITIZEN,
          rank: 'Cadete',
          display_id: 'ZARX-' + user.id.slice(0, 8).toUpperCase(),
          reputation_score: 100
        };

        const { data: inserted } = await this.supabase
          .from('profiles')
          .upsert(fallbackProfile as any)
          .select()
          .maybeSingle();

        if (inserted) {
          this.profile.set(inserted as Profile);
          return inserted as Profile;
        }
      }
    } catch (e) {
      Logger.warn('[Auth] fetchProfile error:', e);
    }
    return null;
  }

  async refreshProfile(): Promise<Profile | null> {
    const user = this.currentUser();
    if (user) {
      return this.fetchProfile(user.id);
    }
    return null;
  }

  // --- Return URL & Navigation State Management ---

  isValidReturnUrl(url: string | null): boolean {
    if (!url || typeof url !== 'string') return false;
    // Must start with single slash and not '//' (prevents open-redirect to external domains)
    if (!url.startsWith('/') || url.startsWith('//')) return false;
    // Must not be an auth path to avoid infinite loops
    if (url.startsWith('/auth')) return false;
    // Must not be root slash (fallback handles default page)
    if (url === '/') return false;
    return true;
  }

  setReturnUrl(url: string | null): void {
    if (!url || !this.isValidReturnUrl(url)) return;
    this._returnUrl.set(url);
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.setItem(this.RETURN_URL_KEY, url); } catch {}
    }
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(this.RETURN_URL_KEY, url); } catch {}
    }
  }

  getReturnUrl(): string | null {
    // 1. In-memory signal
    const mem = this._returnUrl();
    if (mem && this.isValidReturnUrl(mem)) return mem;

    // 2. URL search params if currently in browser
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const qUrl = params.get('returnUrl');
        if (qUrl && this.isValidReturnUrl(qUrl)) return qUrl;
      } catch {}
    }

    // 3. SessionStorage
    if (typeof sessionStorage !== 'undefined') {
      try {
        const sUrl = sessionStorage.getItem(this.RETURN_URL_KEY);
        if (sUrl && this.isValidReturnUrl(sUrl)) return sUrl;
      } catch {}
    }

    // 4. LocalStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const lUrl = localStorage.getItem(this.RETURN_URL_KEY);
        if (lUrl && this.isValidReturnUrl(lUrl)) return lUrl;
      } catch {}
    }

    // 5. Fallback to last visited URL before navigating to login
    return this.getLastVisitedUrl();
  }

  consumeReturnUrl(): string | null {
    const url = this.getReturnUrl();
    this.clearReturnUrl();
    return url;
  }

  clearReturnUrl(): void {
    this._returnUrl.set(null);
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.removeItem(this.RETURN_URL_KEY); } catch {}
    }
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem(this.RETURN_URL_KEY); } catch {}
    }
  }

  trackLastVisitedUrl(url: string): void {
    if (!this.isValidReturnUrl(url)) return;
    this._lastVisitedUrl.set(url);
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.setItem(this.LAST_VISITED_URL_KEY, url); } catch {}
    }
  }

  getLastVisitedUrl(): string | null {
    const mem = this._lastVisitedUrl();
    if (mem && this.isValidReturnUrl(mem)) return mem;
    if (typeof sessionStorage !== 'undefined') {
      try {
        const sUrl = sessionStorage.getItem(this.LAST_VISITED_URL_KEY);
        if (sUrl && this.isValidReturnUrl(sUrl)) return sUrl;
      } catch {}
    }
    return null;
  }

  getDefaultRouteForUser(): string {
    const user = this.currentUser();
    const metadata = user?.user_metadata;
    const role = metadata?.['role'] || AppConstants.CONFIG.ROLES.CIVILIAN;
    return role === AppConstants.CONFIG.ROLES.RESPONDER ? '/dashboard/responder' : '/inicio';
  }

  navigateToReturnUrlOrDefault(): void {
    const returnUrl = this.consumeReturnUrl();
    const target = returnUrl || this.getDefaultRouteForUser();
    Logger.debug('[Auth] Navigating after login to:', target);
    this.router.navigateByUrl(target);
  }

  getBaseRedirectUrl(): string {
    if (typeof window !== 'undefined' && window.location.origin) {
      if (Capacitor.isNativePlatform() && environment.authRedirectUrl) {
        return environment.authRedirectUrl;
      }
      return window.location.origin;
    }
    return environment.authRedirectUrl || 'http://localhost:4200';
  }

  getAuthCallbackRedirectUrl(targetReturnUrl?: string): string {
    const returnUrl = targetReturnUrl || this.getReturnUrl();
    const base = this.getBaseRedirectUrl();
    if (returnUrl) {
      return `${base}/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
    return `${base}/inicio`;
  }

  private handleNavigation(event: AuthChangeEvent) {
    if (event === 'SIGNED_IN') {
      // Only redirect if we are in an auth flow or root
      const currentUrl = this.router.url;
      if (currentUrl === '/' || currentUrl.startsWith('/auth')) {
        this.navigateToReturnUrlOrDefault();
      }
    } else if (event === 'SIGNED_OUT') {
      this.clearReturnUrl();
      this.router.navigate(['/auth/login']);
    }
  }

  // --- Actions ---

  async signInWithEmail(email: string, targetReturnUrl?: string) {
    const returnUrl = targetReturnUrl || this.getReturnUrl();
    if (returnUrl) {
      this.setReturnUrl(returnUrl);
    }

    const redirectUrl = this.getAuthCallbackRedirectUrl(returnUrl || undefined);
    Logger.debug('[Auth] Email Redirect URL:', redirectUrl);
    
    return this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
  }

  async signInWithPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async signUp(
    email: string, 
    password: string, 
    metadata: { full_name: string; phone?: string; username: string },
    targetReturnUrl?: string
  ) {
    const returnUrl = targetReturnUrl || this.getReturnUrl();
    if (returnUrl) {
      this.setReturnUrl(returnUrl);
    }

    const redirectUrl = this.getAuthCallbackRedirectUrl(returnUrl || undefined);
    Logger.debug('[Auth] SignUp Redirect URL:', redirectUrl);
    
    return this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: metadata.full_name,
          username: metadata.username,
          phone: metadata.phone
        }
      },
    });
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'facebook', targetReturnUrl?: string) {
    const returnUrl = targetReturnUrl || this.getReturnUrl();
    if (returnUrl) {
      this.setReturnUrl(returnUrl);
    }

    if (this.currentUser()) {
      this.navigateToReturnUrlOrDefault();
      return { data: null, error: null };
    }

    const redirectUrl = this.getAuthCallbackRedirectUrl(returnUrl || undefined);
    Logger.debug('[Auth] OAuth Redirect URL:', redirectUrl);

    return this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });
  }

  async signOut() {
    this.clearReturnUrl();
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.removeItem(this.LAST_VISITED_URL_KEY); } catch {}
    }
    await this.supabase.auth.signOut();
  }
}
