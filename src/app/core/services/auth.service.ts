import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  role?: 'civilian' | 'responder' | 'military' | 'admin';
  avatar_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService).client;
  private router = inject(Router);

  // Signals for Auth State
  currentUser = signal<User | null>(null);
  session = signal<Session | null>(null);
  profile = signal<Profile | null>(null);

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
      // Small Delay to ensure profile fetch starts? Or check Metadata directly
      // Better to check metadata first for speed, then profile fallback
      const user = this.currentUser();
      const metadata = user?.user_metadata;
      
      // Determine Role
      const role = metadata?.['role'] || 'civilian'; 

      if (role === 'responder') {
        this.router.navigate(['/dashboard/responder']);
      } else {
        this.router.navigate(['/map']);
      }
    } else if (event === 'SIGNED_OUT') {
      this.router.navigate(['/auth/login']);
    }
  }

  // --- Actions ---

  async signInWithEmail(email: string) {
    return this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
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
    return this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: metadata.full_name,
          username: metadata.username,
          phone: metadata.phone
        }
      },
    });
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'facebook') {
    return this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }
}
