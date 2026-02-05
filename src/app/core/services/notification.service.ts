import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  metadata?: any; 
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private supabase = inject(SupabaseService).client;
  private auth = inject(AuthService);

  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);
  
  private subscription: RealtimeChannel | null = null;

  constructor() {
    // Auto-load on init if user exists
    if (this.auth.currentUser()) {
      this.loadNotifications();
      this.subscribeToNotifications();
    }
  }

  async loadNotifications() {
    const user = this.auth.currentUser();
    if (!user) return;

    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      this.notifications.set(data as Notification[]);
      this.updateUnreadCount();
    }
  }

  async markAsRead(id: string) {
    // Optimistic Update
    this.notifications.update(list => 
      list.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    this.updateUnreadCount();

    // DB Update
    await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  }

  async markAllAsRead() {
    const ids = this.notifications()
        .filter(n => !n.is_read)
        .map(n => n.id);
        
    if (ids.length === 0) return;

    // Optimistic
    this.notifications.update(list => list.map(n => ({...n, is_read: true})));
    this.updateUnreadCount();

    await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids);
  }

  private updateUnreadCount() {
    const count = this.notifications().filter(n => !n.is_read).length;
    this.unreadCount.set(count);
  }

  private subscribeToNotifications() {
    const user = this.auth.currentUser();
    if (!user || this.subscription) return;

    this.subscription = this.supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          this.notifications.update(list => [newNotif, ...list]);
          this.updateUnreadCount();
          
          // Feedback
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([50, 50, 50]); // Short vibe
            }
            new Audio('assets/sounds/notification_pop.mp3').play().catch(() => {}); 
          } catch(e) {}
        }
      )
      .subscribe();
  }
}
