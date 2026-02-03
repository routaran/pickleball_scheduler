import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = ''; // To be configured with actual DSN

export const CrashReporting = {
  init(): void {
    if (!SENTRY_DSN) {
      console.log('Sentry DSN not configured - crash reporting disabled');
      return;
    }

    Sentry.init({
      dsn: SENTRY_DSN,
      debug: __DEV__,
      enableAutoSessionTracking: true,
      tracesSampleRate: 1.0,
    });
  },

  captureException(error: Error, context?: Record<string, unknown>): void {
    if (context) {
      Sentry.setExtras(context);
    }
    Sentry.captureException(error);
  },

  captureMessage(message: string, level?: Sentry.SeverityLevel): void {
    Sentry.captureMessage(message, level);
  },

  setUser(userId: string | null): void {
    if (userId) {
      Sentry.setUser({ id: userId });
    } else {
      Sentry.setUser(null);
    }
  },

  addBreadcrumb(message: string, category?: string): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
    });
  },
};
