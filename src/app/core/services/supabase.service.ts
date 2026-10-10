import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private platformId = inject(PLATFORM_ID);
  private _client: SupabaseClient;

  // Connectivity & offline signals
  public isOnline = signal<boolean>(true);

  constructor() {
    this._client = createClient(environment.supabase.url, environment.supabase.key, {
      db: {
        schema: (environment.supabase as any).schema || 'zarx'
      },
      auth: {
        persistSession: isPlatformBrowser(this.platformId),
        autoRefreshToken: isPlatformBrowser(this.platformId)
      }
    });

    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      this.isOnline.set(navigator.onLine);
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }
  }

  get client(): SupabaseClient {
    return this._client;
  }

  /**
   * Resilient execution wrapper for Supabase queries.
   * - In SSR: Imposes a strict short timeout (1500ms) and never throws or hangs the server.
   * - In Browser: Retries up to 2 times with exponential backoff and falls back to offline cache.
   */
  async safeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    cacheKey?: string,
    timeoutMs: number = 6000
  ): Promise<{ data: T | null; error: any; fromCache?: boolean }> {
    const isBrowser = isPlatformBrowser(this.platformId);
    const effectiveTimeout = isBrowser ? timeoutMs : 1500;

    // Timeout Promise
    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
      setTimeout(() => {
        resolve({ data: null, error: new Error(`[SupabaseService] Query timeout (${effectiveTimeout}ms)`) });
      }, effectiveTimeout);
    });

    // Execute with retries if on browser
    let attempts = 0;
    const maxAttempts = isBrowser ? 2 : 1;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const result = await Promise.race([queryFn(), timeoutPromise]);
        
        if (!result.error && result.data !== null) {
          if (isBrowser && cacheKey) {
            this.setCache(cacheKey, result.data);
          }
          return { data: result.data, error: null, fromCache: false };
        }

        if (attempts >= maxAttempts) {
          if (isBrowser && cacheKey) {
            const cached = this.getCache<T>(cacheKey);
            if (cached !== null) {
              return { data: cached, error: null, fromCache: true };
            }
          }
          return { data: null, error: result.error };
        }
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          if (isBrowser && cacheKey) {
            const cached = this.getCache<T>(cacheKey);
            if (cached !== null) {
              return { data: cached, error: null, fromCache: true };
            }
          }
          return { data: null, error: err };
        }
      }

      // Exponential backoff
      await new Promise(r => setTimeout(r, attempts * 300));
    }

    return { data: null, error: new Error('[SupabaseService] Query failed after retries') };
  }

  public getCache<T>(key: string): T | null {
    if (!isPlatformBrowser(this.platformId) || typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const item = localStorage.getItem(`zarx_cache_${key}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  public setCache(key: string, data: any): void {
    if (!isPlatformBrowser(this.platformId) || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(`zarx_cache_${key}`, JSON.stringify(data));
    } catch (_) {}
  }
}
