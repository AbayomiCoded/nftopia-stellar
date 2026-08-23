import { AppError } from '@/src/errors/types';
import { errorLogger } from '@/src/errors/logger';

interface ErrorReport {
  error: AppError;
  componentName?: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  context?: Record<string, any>;
}

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  report(error: AppError | Error, componentName?: string, context?: Record<string, any>): void {
    if (!this.enabled) return;

    const appError: AppError = {
      ...error,
      code: (error as AppError).code || 'ERR_UNKNOWN',
      severity: (error as AppError).severity || 'medium',
      timestamp: Date.now(),
      context: { ...(error as AppError).context, ...context },
    };

    errorLogger.log(appError, componentName, undefined, context);

    // In production, send to your error reporting service
    if (!__DEV__) {
      this.sendToService(appError, componentName);
    }
  }

  private sendToService(error: AppError, componentName?: string): void {
    const report: ErrorReport = {
      error,
      componentName,
      sessionId: errorLogger.getSessionId(),
      timestamp: Date.now(),
      context: error.context,
    };

    // Send to analytics service (e.g., Sentry, Firebase Crashlytics)
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     tags: { component: componentName || 'unknown' },
    //     extra: { context: error.context },
    //   });
    // }

    console.log('[ErrorReporting] Report sent:', report);
  }

  reportNetworkError(url: string, status: number, message: string): void {
    const error = new Error(`Network error: ${message}`);
    this.report(
      error,
      'NetworkRequest',
      { url, status, message }
    );
  }

  reportApiError(endpoint: string, error: Error, response?: any): void {
    this.report(
      error,
      'APIRequest',
      { endpoint, response }
    );
  }

  reportRenderError(componentName: string, error: Error, props?: any): void {
    this.report(
      error,
      componentName,
      { props }
    );
  }
}

export const errorReportingService = ErrorReportingService.getInstance();