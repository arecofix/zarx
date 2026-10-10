import { TestBed } from '@angular/core/testing';
import { PwaInstallService } from './pwa-install.service';
import { PLATFORM_ID } from '@angular/core';

describe('PwaInstallService (PWA Install Lifecycle)', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PwaInstallService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    service = TestBed.inject(PwaInstallService);
  });

  it('initializes with isInstallable = false when beforeinstallprompt has not fired', () => {
    expect(service.isInstallable()).toBe(false);
    expect(service.installOutcome()).toBeNull();
  });

  it('captures beforeinstallprompt event and sets isInstallable = true', () => {
    const mockEvent = new Event('beforeinstallprompt');
    (mockEvent as any).prompt = jest.fn().mockResolvedValue(undefined);
    (mockEvent as any).userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    window.dispatchEvent(mockEvent);

    expect(service.isInstallable()).toBe(true);
  });

  it('triggers prompt and updates installOutcome when user accepts', async () => {
    const promptSpy = jest.fn().mockResolvedValue(undefined);
    const mockEvent = new Event('beforeinstallprompt');
    (mockEvent as any).prompt = promptSpy;
    (mockEvent as any).userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    window.dispatchEvent(mockEvent);

    const outcome = await service.promptInstall();

    expect(promptSpy).toHaveBeenCalled();
    expect(outcome).toBe('accepted');
    expect(service.isInstallable()).toBe(false);
  });

  it('handles user dismissing prompt cleanly', async () => {
    const promptSpy = jest.fn().mockResolvedValue(undefined);
    const mockEvent = new Event('beforeinstallprompt');
    (mockEvent as any).prompt = promptSpy;
    (mockEvent as any).userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });

    window.dispatchEvent(mockEvent);

    const outcome = await service.promptInstall();

    expect(promptSpy).toHaveBeenCalled();
    expect(outcome).toBe('dismissed');
  });

  it('dismissPrompt resets isInstallable without launching browser dialog', () => {
    service.isInstallable.set(true);

    service.dismissPrompt();

    expect(service.isInstallable()).toBe(false);
    expect(service.installOutcome()).toBe('dismissed');
  });
});
