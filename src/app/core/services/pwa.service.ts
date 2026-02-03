import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private platformId = inject(PLATFORM_ID);
  
  // State Signals
  private deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  public isInstallable = signal(false);

  constructor() {
    this.initPwa();
  }

  private initPwa() {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later.
      this.deferredPrompt.set(e as BeforeInstallPromptEvent);
      this.isInstallable.set(true);
      
      console.log('PWA: System ready for install!');
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA: Application installed');
      this.deferredPrompt.set(null);
      this.isInstallable.set(false);
    });
  }

  public async installApp(): Promise<void> {
    const promptEvent = this.deferredPrompt();
    if (!promptEvent) return;

    // Show the install prompt
    await promptEvent.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    
    console.log(`PWA: User response to install prompt: ${outcome}`);

    // Check outcome
    if (outcome === 'accepted') {
        this.deferredPrompt.set(null);
        this.isInstallable.set(false);
    }
    // else: User dismissed, we can keep the prompt for later or it might be invalidated depending on browser
  }
}
