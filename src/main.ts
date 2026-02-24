import { bootstrapApplication } from '@angular/platform-browser';
import { enableProdMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';
// @ts-ignore
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Enable production mode if not in development
if (environment.production) {
  enableProdMode();
}

// Initialize PWA Elements (Camera, Toast, etc.) in the window context
defineCustomElements(window);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
