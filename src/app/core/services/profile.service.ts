import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Profile } from '../models';
import { AppConstants } from '../constants/app.constants';
import { Logger } from '../utils/logger';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private supabase = inject(SupabaseService).client;
  private auth = inject(AuthService);

  public currentProfile = signal<Profile | null>(null);

  constructor() {}

  /**
   * Generates a tactical C4ISR display ID if none exists.
   */
  public generateDisplayId(profileId?: string | null, customIndex?: number): string {
    if (customIndex !== undefined) {
      return `ZARX-${String(customIndex).padStart(4, '0')}`;
    }
    if (profileId && profileId.trim()) {
      return `ZARX-${profileId.slice(0, 8).toUpperCase()}`;
    }
    return 'ZARX-0001';
  }

  /**
   * Resolves tactical profile fields with guaranteed fallbacks.
   * Solves the bugs reported for "Ezequiel Enrico Areco".
   */
  public resolveProfileDefaults(rawProfile?: Partial<Profile> | null): Profile {
    const user = this.auth.currentUser();
    const meta = user?.user_metadata || {};

    const fallbackId = rawProfile?.id || user?.id || '00000000-0000-0000-0000-000000000000';
    const fallbackName = rawProfile?.full_name || rawProfile?.username || meta['full_name'] || meta['name'] || user?.email?.split('@')[0] || 'Agente';
    const fallbackAvatar = rawProfile?.avatar_url || meta['avatar_url'] || meta['picture'] || AppConstants.ASSETS.IMAGES.AVATAR_PLACEHOLDER;
    const fallbackRole = rawProfile?.role || meta['role'] || AppConstants.CONFIG.ROLES.CITIZEN;
    const fallbackRank = rawProfile?.rank || (fallbackRole === 'admin' ? 'Director C4ISR' : 'Cadete');
    const fallbackDisplayId = rawProfile?.display_id || this.generateDisplayId(fallbackId);

    return {
      id: fallbackId,
      full_name: fallbackName,
      email: rawProfile?.email || user?.email || '',
      avatar_url: fallbackAvatar,
      role: fallbackRole as any,
      rank: fallbackRank,
      display_id: fallbackDisplayId,
      reputation_score: rawProfile?.reputation_score ?? 100,
      is_shadowbanned: rawProfile?.is_shadowbanned ?? false
    };
  }

  /**
   * Fetches profile from Supabase with 404 / empty fallback.
   */
  public async getProfile(userId: string): Promise<Profile> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const resolved = this.resolveProfileDefaults(data);
      this.currentProfile.set(resolved);
      return resolved;
    } catch (err) {
      Logger.warn('[ProfileService] Error obteniendo perfil, usando fallback:', err);
      const fallback = this.resolveProfileDefaults({ id: userId });
      this.currentProfile.set(fallback);
      return fallback;
    }
  }
}
