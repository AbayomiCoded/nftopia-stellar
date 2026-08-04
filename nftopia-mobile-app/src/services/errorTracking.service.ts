import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import { errorLogger } from '@/src/errors/logger';
import { analyticsService } from '@/src/analytics/analytics.service';
import * as Device from 'expo-device';

export interface ErrorTrackingConfig {
  dsn: string;
  environment: string;
  release: string;
  enableInDevelopment?: boolean;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  componentName?: string;
  action?: string;
  extra?: Record<string, any>;
  tags?: Record<string, string>;
}

class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  initialize(config: ErrorTrackingConfig): void {
    if (this.isInitialized) return;
    if (!__DEV__ || config.enableInDevelopment) {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        enableInExpoDevelopment: true,
        debug: __DEV__,
        tracesSampleRate: config.tracesSampleRate || 0.2,
        profilesSampleRate: config.profilesSampleRate || 0.1,
        integrations: [
          new Sentry.ReactNativeTracing({
            enableStallTracking: true,
            stallTimeoutMs: 3000,
          }),
        ],
        beforeSend: (event, hint) => {
          // Filter out non-critical errors in development
          if (__DEV__) {
            return event;
          }
          return event;
        },
      });

      // Add device context
      this.setDeviceContext();
      
      this.isInitialized = true;
      console.log('[ErrorTracking] Initialized successfully');
    }
  }

  private async setDeviceContext(): Promise<void> {
    try {
      const deviceInfo = {
        platform: Platform.OS,
        platformVersion: Platform.Version,
        deviceName: await Device.getDeviceNameAsync(),
        modelName: await Device.getModelNameAsync(),
        osName: await Device.getOsNameAsync(),
        osVersion: await Device.getOsVersionAsync(),
        isDevice: await Device.isDeviceAsync(),
      };

      Sentry.setContext('device', deviceInfo);
    } catch (error) {
      console.warn('Failed to set device context:', error);
    }
  }

  // Set user context
  setUser(user: { id: string; email?: string; username?: string }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    analyticsService.setUserProperty('user_id', user.id);
  }

  // Clear user context
  clearUser(): void {
    Sentry.setUser(null);
  }

  // Set tags
  setTags(tags: Record<string, string>): void {
    Sentry.setTags(tags);
  }

  // Set extra context
  setContext(name: string, context: Record<string, any>): void {
    Sentry.setContext(name, context);
  }

  // Capture exception
  captureException(
    error: Error | string,
    context?: ErrorContext
  ): string {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Add context
    if (context) {
      if (context.userId) {
        Sentry.setUser({ id: context.userId });
      }
      
      if (context.componentName) {
        Sentry.setTag('component', context.componentName);
      }
      
      if (context.action) {
        Sentry.setTag('action', context.action);
      }
      
      if (context.extra) {
        Sentry.setContext('extra', context.extra);
      }
      
      if (context.tags) {
        Sentry.setTags(context.tags);
      }
    }

    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: 'error',
      message: errorObj.message,
      level: 'error',
      data: context?.extra || {},
    });

    // Capture the exception
    const eventId = Sentry.captureException(errorObj);

    // Log to local error logger
    errorLogger.log(
      errorObj,
      context?.componentName || 'Unknown',
      context?.userId,
      context?.extra
    );

    // Track to analytics
    analyticsService.track('error_captured', {
      error: errorObj.message,
      stack: errorObj.stack,
      component: context?.componentName,
      action: context?.action,
      eventId,
    });

    return eventId;
  }

  // Capture message
  captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
    context?: ErrorContext
  ): string {
    if (context) {
      if (context.componentName) {
        Sentry.setTag('component', context.componentName);
      }
      if (context.extra) {
        Sentry.setContext('extra', context.extra);
      }
    }

    const eventId = Sentry.captureMessage(message, level);
    
    analyticsService.track('message_captured', {
      message,
      level,
      component: context?.componentName,
      eventId,
    });

    return eventId;
  }

  // Add breadcrumb
  addBreadcrumb(
    message: string,
    category: string = 'default',
    level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
    data?: Record<string, any>
  ): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  // Start performance transaction
  startTransaction(
    name: string,
    op: string,
    tags?: Record<string, string>
  ): any {
    return Sentry.startTransaction({
      name,
      op,
      tags,
    });
  }

  // End performance transaction
  endTransaction(transaction: any): void {
    if (transaction) {
      transaction.finish();
    }
  }

  // Set user feedback
  setUserFeedback(eventId: string, comments: string, email?: string): void {
    Sentry.captureUserFeedback({
      eventId,
      comments,
      email: email,
    });
  }

  // Check if initialized
  isEnabled(): boolean {
    return this.isInitialized;
  }

  // Flush events
  async flush(timeout?: number): Promise<void> {
    await Sentry.flush(timeout);
  }

  // Close SDK
  async close(): Promise<void> {
    await Sentry.close();
    this.isInitialized = false;
  }

  // Get current session ID
  getSessionId(): string | null {
    return Sentry.getCurrentHub().getScope()?.getSession()?.sid || null;
  }

  // Get last event ID
  getLastEventId(): string {
    return Sentry.getLastEventId() || '';
  }
}

export const errorTrackingService = ErrorTrackingService.getInstance();