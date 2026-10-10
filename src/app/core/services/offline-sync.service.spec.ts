import { TestBed } from '@angular/core/testing';
import { OfflineSyncService, OfflineQueuedReport } from './offline-sync.service';
import { PLATFORM_ID } from '@angular/core';

describe('OfflineSyncService (Offline-First Store & Forward)', () => {
  let service: OfflineSyncService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        OfflineSyncService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    service = TestBed.inject(OfflineSyncService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('enqueue', () => {
    it('enqueues report in local storage with QUEUED status', () => {
      const item = service.enqueue({
        id: 'rep-001',
        type: 'SOS',
        latitude: -34.7709,
        longitude: -58.8335,
        description: 'Emergencia por anegamiento'
      });

      expect(item.id).toBe('rep-001');
      expect(item.status).toBe('QUEUED');
      expect(service.queue().length).toBe(1);

      const stored = service.loadQueueFromStorage();
      expect(stored.length).toBe(1);
      expect(stored[0].id).toBe('rep-001');
    });

    it('deduplicates reports if the same ID is enqueued again', () => {
      service.enqueue({
        id: 'rep-dup',
        type: 'ROBO',
        latitude: -34.7709,
        longitude: -58.8335,
        description: 'Primer reporte'
      });

      service.enqueue({
        id: 'rep-dup',
        type: 'ROBO',
        latitude: -34.7709,
        longitude: -58.8335,
        description: 'Reporte actualizado'
      });

      expect(service.queue().length).toBe(1);
      expect(service.queue()[0].description).toBe('Reporte actualizado');
    });
  });

  describe('flushQueue', () => {
    it('flushes queued reports when sync succeeds and leaves queue empty', async () => {
      service.enqueue({
        id: 'rep-sync-1',
        type: 'SOS',
        latitude: -34.7709,
        longitude: -58.8335,
        description: 'SOS 1'
      });
      service.enqueue({
        id: 'rep-sync-2',
        type: 'INCENDIO',
        latitude: -34.7710,
        longitude: -58.8336,
        description: 'SOS 2'
      });

      const mockSync = jest.fn().mockResolvedValue({ success: true });
      const result = await service.flushQueue(mockSync);

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(service.queue().length).toBe(0);
    });

    it('keeps failed items in queue with incremented retryCount', async () => {
      service.enqueue({
        id: 'rep-fail-1',
        type: 'SOS',
        latitude: -34.7709,
        longitude: -58.8335,
        description: 'SOS Fallido'
      });

      const mockSync = jest.fn().mockResolvedValue({ success: false });
      const result = await service.flushQueue(mockSync);

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(service.queue().length).toBe(1);
      expect(service.queue()[0].retryCount).toBe(1);
      expect(service.queue()[0].status).toBe('FAILED');
    });

    it('handles HTTP 409 conflict idempotently as synced', async () => {
      service.enqueue({
        id: 'rep-409',
        type: 'SOS',
        latitude: -34.7709,
        longitude: -58.8335,
        description: 'Conflicto existente'
      });

      const conflictError: any = new Error('Conflict: duplicate key');
      conflictError.status = 409;
      const mockSync = jest.fn().mockRejectedValue(conflictError);

      const result = await service.flushQueue(mockSync);
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(service.queue().length).toBe(0);
    });

    it('can process large volume of 1,000 items in chunks without blowing up heap memory', async () => {
      const largeQueue: OfflineQueuedReport[] = [];
      for (let i = 0; i < 1000; i++) {
        largeQueue.push({
          id: `bulk-${i}`,
          clientTimestamp: Date.now(),
          type: 'SOS',
          latitude: -34.77,
          longitude: -58.83,
          description: `Bulk ${i}`,
          status: 'QUEUED',
          retryCount: 0
        });
      }

      localStorage.setItem('zarx_offline_reports_queue', JSON.stringify(largeQueue));
      service.loadQueueFromStorage();
      expect(service.queue().length).toBe(1000);

      const mockSync = jest.fn().mockResolvedValue({ success: true });
      const result = await service.flushQueue(mockSync);

      expect(result.synced).toBe(1000);
      expect(service.queue().length).toBe(0);
    });
  });
});
