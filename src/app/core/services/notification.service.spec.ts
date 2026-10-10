import { TestBed } from '@angular/core/testing';
import { NotificationService, Notification } from './notification.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

describe('NotificationService (C4ISR Realtime Alerts)', () => {
  let service: NotificationService;
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { id: 'notif-1', user_id: 'u1', title: 'Alerta Roja', message: 'Crecida en La Paja', is_read: false },
                    { id: 'notif-2', user_id: 'u1', title: 'Aviso', message: 'Evacuación preventiva', is_read: true }
                  ],
                  error: null
                })
              })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
            in: jest.fn().mockResolvedValue({ error: null })
          })
        }),
        channel: jest.fn().mockReturnValue({
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn().mockReturnThis()
        })
      }
    };

    mockAuth = {
      currentUser: jest.fn().mockReturnValue({ id: 'u1', email: 'test@zarx.mil' })
    };

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AuthService, useValue: mockAuth }
      ]
    });

    service = TestBed.inject(NotificationService);
  });

  it('loads notifications and correctly sets unreadCount', async () => {
    await service.loadNotifications();

    expect(service.notifications().length).toBe(2);
    expect(service.unreadCount()).toBe(1);
  });

  it('optimistically marks individual notification as read', async () => {
    service.notifications.set([
      { id: 'n1', user_id: 'u1', title: 'Test', message: 'Msg', is_read: false, created_at: '' }
    ]);
    expect(service.unreadCount()).toBe(1);

    await service.markAsRead('n1');

    expect(service.notifications()[0].is_read).toBe(true);
    expect(service.unreadCount()).toBe(0);
    expect(mockSupabase.client.from().update).toHaveBeenCalledWith({ is_read: true });
  });

  it('optimistically marks all notifications as read', async () => {
    service.notifications.set([
      { id: 'n1', user_id: 'u1', title: 'Test 1', message: 'Msg 1', is_read: false, created_at: '' },
      { id: 'n2', user_id: 'u1', title: 'Test 2', message: 'Msg 2', is_read: false, created_at: '' }
    ]);
    expect(service.unreadCount()).toBe(2);

    await service.markAllAsRead();

    expect(service.unreadCount()).toBe(0);
    expect(service.notifications().every(n => n.is_read)).toBe(true);
  });
});
