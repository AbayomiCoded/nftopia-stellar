import { AppError, ErrorSeverity } from './types';
import { errorTrackingService } from '@/src/services/errorTracking.service';
import * as Device from 'expo-device';

interface ErrorLogEntry {
  timestamp: number;
  error: AppError;
  componentName?: string;
  userId?: string;
  sessionId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model: string;
  };
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async log(
    error: Error | AppError,
    componentName?: string,
    userId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    const appError: AppError = {
      ...error,
      code: (error as AppError).code || 'ERR_UNKNOWN',
      severity: (error as AppError).severity || 'medium',
      context: { ...(error as AppError).context, ...context },
      timestamp: Date.now(),
      userMessage: (error as AppError).userMessage || error.message,
      recoverable: (error as AppError).recoverable !== undefined ? (error as AppError).recoverable : true,
    };

    const entry: ErrorLogEntry = {
      timestamp: Date.now(),
      error: appError,
      componentName,
      userId,
      sessionId: this.sessionId,
      deviceInfo: await this.getDeviceInfo(),
    };

    this.logs.push(entry);

    // Trim logs if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (__DEV__) {
      console.error(`[ErrorBoundary] ${componentName || 'App'}:`, {
        error: appError,
        context,
        sessionId: this.sessionId,
      });
    }

    // Report to Sentry for critical errors
    if (appError.severity === 'critical' || appError.severity === 'high') {
      errorTrackingService.captureException(error, {
        componentName,
        userId,
        extra: context,
        tags: {
          severity: appError.severity,
          code: appError.code || 'ERR_UNKNOWN',
        },
      });
    }

    // Report to analytics
    this.reportToAnalytics(appError, componentName);
  }

  private async getDeviceInfo() {
    try {
      return {
        platform: 'react-native',
        version: '1.0.0',
        model: Device.modelName || 'unknown',
      };
    } catch {
      return {
        platform: 'react-native',
        version: '1.0.0',
        model: 'unknown',
      };
    }
  }

  private reportToAnalytics(error: AppError, componentName?: string): void {
    if (__DEV__) {
      console.log('[Analytics] Error reported:', {
        error: error.message,
        code: error.code,
        severity: error.severity,
        component: componentName,
        timestamp: error.timestamp,
      });
    }
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  getErrorsBySeverity(severity: ErrorSeverity): ErrorLogEntry[] {
    return this.logs.filter((entry) => entry.error.severity === severity);
  }

  getErrorsByComponent(componentName: string): ErrorLogEntry[] {
    return this.logs.filter((entry) => entry.componentName === componentName);
  }

  clearLogs(): void {
    this.logs = [];
  }

  getSessionId(): string {
    return this.sessionId;
  }

  formatUserMessage(error: AppError): string {
    if (error.userMessage) return error.userMessage;
    return error.message || 'Something went wrong. Please try again.';
  }
}

export const errorLogger = ErrorLogger.getInstance();