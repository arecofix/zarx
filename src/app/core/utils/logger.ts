import { environment } from '../../../environments/environment';

/**
 * Environment-aware logger utility.
 * In production, only warnings and errors are logged.
 * In development, all levels are logged.
 */
export const Logger = {
  debug(...args: any[]) {
    if (!environment.production) {
      console.log('[DEBUG]', ...args);
    }
  },

  info(...args: any[]) {
    if (!environment.production) {
      console.info('[INFO]', ...args);
    }
  },

  warn(...args: any[]) {
    console.warn('[WARN]', ...args);
  },

  error(...args: any[]) {
    console.error('[ERROR]', ...args);
  }
};
