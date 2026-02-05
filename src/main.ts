import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
// @ts-ignore
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Initialize PWA Elements (Camera, Toast, etc.) in the window context
defineCustomElements(window);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
