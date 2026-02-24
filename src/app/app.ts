import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { MessagingService } from './core/services/messaging.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Zarx Security');
  public router = inject(Router);
  private messaging = inject(MessagingService);
  private swUpdate = inject(SwUpdate);

  constructor() {
    this.init();
    this.checkForUpdates();
  }

  async init() {
    // Audit Check
    if (environment.firebase?.apiKey?.includes('YOUR_')) {
      console.error('CRITICAL: Firebase Config is missing in environment.ts! Push notifications will fail.');
    } else {
      // Initialize Messaging (Setup permissions, tokens, and listeners)
      await this.messaging.init();
    }
  }

  checkForUpdates() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          if (confirm('Nueva versión disponible. ¿Recargar ahora?')) {
            window.location.reload();
          }
        });
    }
  }
}
