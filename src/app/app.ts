import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { NotificationSetupService } from './core/services/notification-setup.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('zarx-system');
  public router = inject(Router);
  private ns = inject(NotificationSetupService);

  constructor() {
    this.init();
  }

  async init() {
    // Audit Check
    if (environment.firebase?.apiKey?.includes('YOUR_')) {
      console.error('CRITICAL: Firebase Config is missing in environment.ts! Push notifications will fail.');
    } else {
      // Init OneSignal or Firebase
      await this.ns.requestPermissionAndSaveToken();
    }
  }
}
