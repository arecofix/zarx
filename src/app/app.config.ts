import { ApplicationConfig, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withEnabledBlockingInitialNavigation(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })
    ),
    provideClientHydration(),
    provideIonicAngular({
      mode: 'ios'
    }),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideMessaging(() => getMessaging()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
