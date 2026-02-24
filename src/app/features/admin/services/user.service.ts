import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Profile } from '../../../core/models';
import { AppConstants } from '../../../core/constants/app.constants';
import { Observable, from, map } from 'rxjs';

/**
 * Service to manage users (profiles) from the Admin Dashboard.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private supabase = inject(SupabaseService).client;

  // Signal to hold the list of users for reactive UI
  users = signal<Profile[]>([]);
  isLoading = signal(false);

  constructor() {}

  /**
   * Fetches all user profiles from Supabase.
   */
  async fetchAllUsers() {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Cast to Profile[] - ensure interface matches DB
        this.users.set(data as any[]); 
      }
    } catch (e) {
      console.error('Error fetching users:', e);
      // Handle error (maybe return it or show toast via a component)
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Updates a user's role.
   * @param userId The ID of the user to update.
   * @param newRole The new role string ('user', 'moderator', 'admin').
   */
  async updateUserRole(userId: string, newRole: string): Promise<boolean> {
    try {
      // 1. Validate role against allowed values if strict
      // const allowed = ['user', 'moderator', 'admin'];
      // if (!allowed.includes(newRole)) throw new Error('Invalid role');

      // 2. Perform Update
      const { data, error } = await this.supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .maybeSingle(); // Use maybeSingle to avoid throw if RLS blocks it (returns null)

      if (error) throw error;
      
      if (!data) {
        console.warn('Update succeeded but no rows returned. Likely RLS policy restricted viewing the result or no changes made.');
        // If RLS blocks select but allows update, we might still want to return true, 
        // but typically RLS blocks the update itself if policies are strict.
        // Let's assume failure if no data returned for now to be safe.
        // return false; 
      }

      // 3. Update local state optimistically or via response
      this.users.update(current => 
        current.map(u => u.id === userId ? { ...u, role: newRole as any } : u)
      );

      return true;
    } catch (e: any) {
      console.error('Error updating role:', e);
      if (e.code === 'PGRST116') {
          return false; // Should not happen with maybeSingle, but good safety
      }
      return false;
    }
  }

  /**
   * Search users by email or username (Local filtering for now if list is small, 
   * or can be converted to RPC/DB query for large datasets).
   */
  searchUsers(term: string) {
    // This is simple local filtering. For >1000 users, use server-side.
    return this.users().filter(u => 
      (u.email?.toLowerCase().includes(term.toLowerCase())) ||
      (u.full_name?.toLowerCase().includes(term.toLowerCase())) ||
      (u.username?.toLowerCase().includes(term.toLowerCase()))
    );
  }
}
