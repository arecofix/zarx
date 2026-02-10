import { Injectable, computed, inject, signal, effect, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

import { Profile } from '../models/index';
import { AppConstants } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService).client;
  private router = inject(Router);
  private injector = inject(Injector);

  // Signals for Auth State
  currentUser = signal<User | null>(null);
  session = signal<Session | null>(null);
  profile = signal<Profile | null>(null);
  
  // Computed Role Check
  isAdmin = computed(() => this.profile()?.role === AppConstants.CONFIG.ROLES.ADMIN);

  // Initialization State
  isInitialized = signal(false);

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    // Check initial session
    const { data } = await this.supabase.auth.getSession();
    this.updateState(data.session);

    // Listen to changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.updateState(session);
      this.handleNavigation(event);
    });

    // Re-validate on resume (Mobile Data Clear Fix)
    document.addEventListener('visibilitychange', async () => {
       if (document.visibilityState === 'visible') {
          const { data } = await this.supabase.auth.getSession();
          if (!data.session && this.currentUser()) {
             // Session invalid but user in memory -> Force Logout
             this.handleNavigation('SIGNED_OUT');
             this.updateState(null);
          }
       }
    });

    // Mark as initialized
    this.isInitialized.set(true);
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
      this.fetchProfile(session.user.id);
    } else {
      this.profile.set(null);
    }
  }

  private async fetchProfile(userId: string) {
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      this.profile.set(data as Profile);
    }
  }

  private handleNavigation(event: AuthChangeEvent) {
    if (event === 'SIGNED_IN') {
      // Only redirect if we are in an auth flow or root
      const currentUrl = this.router.url;
      if (currentUrl === '/' || currentUrl.startsWith('/auth')) {
          const user = this.currentUser();
          const metadata = user?.user_metadata;
          const role = metadata?.['role'] || AppConstants.CONFIG.ROLES.CIVILIAN; 

          if (role === AppConstants.CONFIG.ROLES.RESPONDER) {
            this.router.navigate(['/dashboard/responder']);
          } else {
            this.router.navigate(['/inicio']);
          }
      }
    } else if (event === 'SIGNED_OUT') {
      this.router.navigate(['/auth/login']);
    }
  }

  // --- Actions ---

  async signInWithEmail(email: string) {
    const redirectUrl = `${window.location.origin}/inicio`;
    
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

  async signUp(email: string, password: string, metadata: { full_name: string; phone?: string; username: string }) {
    const redirectUrl = `${window.location.origin}/inicio`;
    
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

  async signInWithOAuth(provider: 'google' | 'github' | 'facebook') {
    if (this.currentUser()) {
       this.handleNavigation('SIGNED_IN');
       return { data: null, error: null };
    }

    // Dynamic Redirect URL based on current environment
    const redirectUrl = `${window.location.origin}/inicio`;

    return this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }
}
