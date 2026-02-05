import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private sirenAudio: HTMLAudioElement | null = null;
  private beepAudio: HTMLAudioElement | null = null;
  
  // Signals
  isMonitoringActive = signal(false);
  audioEnabled = signal(false);

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof Audio !== 'undefined') {
      try {
        this.sirenAudio = new Audio('/assets/sounds/siren.mp3?v=1');
        this.beepAudio = new Audio('/assets/sounds/beep.alert.mp3?v=1');
        
        // Preload
        this.sirenAudio.load();
        this.beepAudio.load();
        
        // Set volume
        this.sirenAudio.volume = 0.7;
        this.beepAudio.volume = 0.5;
      } catch (error) {
        console.warn('Audio initialization failed:', error);
      }
    }
  }

  /**
   * Activate monitoring mode
   * This requires a user gesture to enable audio playback
   */
  activateMonitoring(): boolean {
    if (!this.sirenAudio) {
      console.error('Audio not initialized');
      return false;
    }

    // Try to play a silent sound to unlock audio
    // This is required by browsers for autoplay policy
    const testPlay = this.sirenAudio.play();
    
    if (testPlay !== undefined) {
      testPlay
        .then(() => {
          // Audio unlocked successfully
          this.sirenAudio!.pause();
          this.sirenAudio!.currentTime = 0;
          this.isMonitoringActive.set(true);
          this.audioEnabled.set(true);
          console.log('✅ Monitoring activated - Audio enabled');
        })
        .catch((error) => {
          console.warn('Audio autoplay blocked:', error);
          this.isMonitoringActive.set(true);
          this.audioEnabled.set(false);
        });
    }

    return true;
  }

  /**
   * Deactivate monitoring mode
   */
  deactivateMonitoring() {
    this.isMonitoringActive.set(false);
    this.stopSiren();
  }

  /**
   * Play siren sound for critical alerts
   */
  playSiren(): Promise<void> {
    if (!this.audioEnabled() || !this.sirenAudio) {
      console.warn('Audio not enabled or not initialized');
      return Promise.resolve();
    }

    // Reset to start
    this.sirenAudio.currentTime = 0;
    
    return this.sirenAudio.play()
      .then(() => {
        console.log('🚨 Siren playing');
      })
      .catch((error) => {
        console.error('Error playing siren:', error);
      });
  }

  /**
   * Stop siren sound
   */
  stopSiren() {
    if (this.sirenAudio) {
      this.sirenAudio.pause();
      this.sirenAudio.currentTime = 0;
    }
  }

  /**
   * Play beep sound for non-critical alerts
   */
  playBeep(): Promise<void> {
    if (!this.audioEnabled() || !this.beepAudio) {
      console.warn('Audio not enabled or not initialized');
      return Promise.resolve();
    }

    this.beepAudio.currentTime = 0;
    
    return this.beepAudio.play()
      .then(() => {
        console.log('🔔 Beep playing');
      })
      .catch((error) => {
        console.error('Error playing beep:', error);
      });
  }

  /**
   * Play alert sound based on priority
   */
  playAlertSound(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') {
    if (priority === 'CRITICAL' || priority === 'HIGH') {
      this.playSiren();
    } else {
      this.playBeep();
    }
  }

  /**
   * Test audio (for user to verify it works)
   */
  testAudio() {
    if (this.sirenAudio) {
      this.sirenAudio.currentTime = 0;
      this.sirenAudio.play()
        .then(() => {
          // Stop after 2 seconds
          setTimeout(() => this.stopSiren(), 2000);
        })
        .catch((error) => {
          console.error('Test audio failed:', error);
        });
    }
  }
}
