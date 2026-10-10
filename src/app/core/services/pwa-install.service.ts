import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Logger } from '../utils/logger';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private platformId = inject(PLATFORM_ID);
  
  // Reactive State Signals
  private deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  public isInstallable = signal<boolean>(false);
  public isInstalled = signal<boolean>(false);
  public installOutcome = signal<'accepted' | 'dismissed' | null>(null);

  constructor() {
    this.initPwaListeners();
  }

  private initPwaListeners(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return;
    }

    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      this.isInstalled.set(true);
      this.isInstallable.set(false);
    }

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Prevent browser default mini-infobar to manage custom prompt
      e.preventDefault();
      
      this.deferredPrompt.set(e as BeforeInstallPromptEvent);
      this.isInstallable.set(true);
      Logger.debug('[PwaInstallService] beforeinstallprompt captured and ready.');
    });

    window.addEventListener('appinstalled', () => {
      Logger.debug('[PwaInstallService] App was successfully installed.');
      this.deferredPrompt.set(null);
      this.isInstallable.set(false);
      this.isInstalled.set(true);
      this.installOutcome.set('accepted');
    });
  }

  /**
   * Triggers the PWA install dialog.
   * Safe to call even if the event has not fired or already used.
   */
  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
    const promptEvent = this.deferredPrompt();
    if (!promptEvent) {
      Logger.debug('[PwaInstallService] promptInstall called but no beforeinstallprompt event available.');
      return 'unsupported';
    }

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      
      this.installOutcome.set(outcome);
      if (outcome === 'accepted') {
        this.deferredPrompt.set(null);
        this.isInstallable.set(false);
        this.isInstalled.set(true);
      }
      return outcome;
    } catch (err) {
      console.warn('[PwaInstallService] Error invoking prompt():', err);
      return 'unsupported';
    }
  }

  // Alias for legacy compatibility
  public installApp(): Promise<any> {
    return this.promptInstall();
  }
}

// Backward compatibility alias
export { PwaInstallService as PwaService };
