import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface NewsPost {
  id?: string;
  content: string;
  type: 'ALERT' | 'INFO' | 'PROMO';
  is_active?: boolean;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private supabase = inject(SupabaseService).client;
  
  // Signal para almacenar caché simple si se necesita
  activeNews = signal<NewsPost[]>([]);

  async getActiveNews() {
    const { data, error } = await this.supabase
      .from('active_news')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    this.activeNews.set(data || []);
    return data as NewsPost[];
  }

  async getAllNewsForAdmin() {
    const { data, error } = await this.supabase
      .from('active_news')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as NewsPost[];
  }

  async createPost(post: NewsPost) {
    const { data, error } = await this.supabase
      .from('active_news')
      .insert({
        content: post.content,
        type: post.type,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateStatus(id: string, isActive: boolean) {
    const { error } = await this.supabase
      .from('active_news')
      .update({ is_active: isActive })
      .eq('id', id);
      
    if (error) throw error;
  }

  async deletePost(id: string) {
    const { error } = await this.supabase
      .from('active_news')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
