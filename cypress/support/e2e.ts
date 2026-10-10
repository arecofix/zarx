import './commands';

// Prevent uncaught exceptions from failing tests if third party analytics fails
Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('ResizeObserver') ||
    err.message.includes('beforeinstallpromptevent') ||
    err.message.includes('google-analytics')
  ) {
    return false;
  }
  return true;
});
