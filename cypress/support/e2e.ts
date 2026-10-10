import './commands';
import { getCurrentUserSession, setCurrentUserSession } from './commands';

beforeEach(() => {
  setCurrentUserSession(null);
});

Cypress.on('window:before:load', (win) => {
  win.localStorage.setItem('hasSeenOnboarding', 'true');
  const session = getCurrentUserSession();
  if (session) {
    win.localStorage.setItem('sb-db-auth-token', JSON.stringify(session));
    win.localStorage.setItem('sb-auth-token', JSON.stringify(session));
  }
});

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
