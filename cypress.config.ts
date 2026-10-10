import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://zarx.arecofix.com.ar',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    retries: {
      runMode: 1,
      openMode: 0
    },
    env: {
      apiUrl: 'https://db.arecofix.com.ar',
      marcosPazLat: -34.7647,
      marcosPazLng: -58.8397
    }
  }
});
