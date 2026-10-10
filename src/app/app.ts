import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { MessagingService } from './core/services/messaging.service';
import { AuthService } from './core/services/auth.service';
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
  private authService = inject(AuthService);

  constructor() {
    this.init();
    this.checkForUpdates();
    this.trackNavigation();
  }

  private trackNavigation() {
    this.router.events
      .pipe(filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd))
      .subscribe((evt) => {
        this.authService.trackLastVisitedUrl(evt.urlAfterRedirects);
      });
  }

  async init() {
    await this.messaging.init();
  }

  checkForUpdates() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(async () => {
          try {
            await this.swUpdate.activateUpdate();
            window.location.reload();
          } catch {
            window.location.reload();
          }
        });

      // Proactively poll for update on start
      this.swUpdate.checkForUpdate().catch(() => {});
    }
  }
}
