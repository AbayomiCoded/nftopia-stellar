import { PostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ANALYTICS_CONFIG, ANALYTICS_EVENTS } from './config';
import { errorLogger } from '@/src/errors/logger';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export interface UserProperties {
  id?: string;
  email?: string;
  username?: string;
  walletAddress?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface FunnelStep {
  funnelId: string;
  step: string;
  properties?: Record<string, any>;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private posthog: PostHog | null = null;
  private isInitialized = false;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private isFlushing = false;
  private flushInterval: NodeJS.Timeout | null = null;
  private consentGiven = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check consent
      await this.loadConsent();

      // Initialize PostHog
      if (ANALYTICS_CONFIG.features.enableAnalytics && this.consentGiven) {
        this.posthog = new PostHog(
          ANALYTICS_CONFIG.posthog.apiKey,
          {
            host: ANALYTICS_CONFIG.posthog.host,
            captureAppLifecycleEvents: ANALYTICS_CONFIG.posthog.captureApplicationLifecycleEvents,
          }
        );
        this.posthog.debug(ANALYTICS_CONFIG.posthog.debug);

        // Set session ID
        this.posthog.register({
          session_id: this.sessionId,
          app_version: '1.0.0',
          platform: 'mobile',
        });

        this.isInitialized = true;
        this.startSession();

        // Start flush interval
        this.flushInterval = setInterval(() => {
          this.flushQueue();
        }, ANALYTICS_CONFIG.tracking.flushInterval);

        // Load user from storage if exists
        await this.loadUser();

        console.log('[Analytics] Initialized successfully');
      }
    } catch (error) {
      console.error('[Analytics] Initialization failed:', error);
      errorLogger.log(error as Error, 'AnalyticsService');
    }
  }

  private async loadConsent(): Promise<void> {
    try {
      const consent = await AsyncStorage.getItem('analytics_consent');
      this.consentGiven = consent === 'true';
    } catch (error) {
      console.error('[Analytics] Failed to load consent:', error);
      this.consentGiven = false;
    }
  }

  private async loadUser(): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem('analytics_user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.id && this.posthog) {
          this.posthog.identify(user.id, user.properties);
        }
      }
    } catch (error) {
      console.error('[Analytics] Failed to load user:', error);
    }
  }

  setConsent(given: boolean): void {
    this.consentGiven = given;
    AsyncStorage.setItem('analytics_consent', String(given));

    if (given && !this.isInitialized) {
      this.initialize();
    } else if (!given && this.posthog) {
      this.posthog.reset();
      this.isInitialized = false;
    }
  }

  hasConsent(): boolean {
    return this.consentGiven;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private startSession(): void {
    if (!this.consentGiven || !this.isInitialized) return;

    this.sessionStartTime = Date.now();
    this.track(ANALYTICS_EVENTS.SESSION_START, {
      session_id: this.sessionId,
      timestamp: this.sessionStartTime,
    });
  }

  private async endSession(): Promise<void> {
    if (!this.sessionStartTime || !this.isInitialized) return;

    const duration = Date.now() - this.sessionStartTime;
    this.track(ANALYTICS_EVENTS.SESSION_END, {
      session_id: this.sessionId,
      duration,
      timestamp: Date.now(),
    });

    await this.flushQueue();
  }

  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.consentGiven) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        session_id: this.sessionId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    // Add to queue
    this.eventQueue.push(event);

    // Auto-flush if queue size exceeds threshold
    if (this.eventQueue.length >= ANALYTICS_CONFIG.tracking.batchSize) {
      this.flushQueue();
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0 || !this.isInitialized) return;

    this.isFlushing = true;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      if (this.posthog) {
        for (const event of events) {
          this.posthog.capture(event.name, event.properties);
        }
        this.posthog.flush();
      } else {
        // Store for later retry
        await this.storeOfflineEvents(events);
      }
    } catch (error) {
      console.error('[Analytics] Failed to flush events:', error);
      // Re-add events to queue
      this.eventQueue = [...this.eventQueue, ...this.eventQueue];
    } finally {
      this.isFlushing = false;
    }
  }

  private async storeOfflineEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('analytics_offline_queue');
      const queue = stored ? JSON.parse(stored) : [];
      const updatedQueue = [...queue, ...events];

      // Limit queue size
      if (updatedQueue.length > ANALYTICS_CONFIG.tracking.maxQueueSize) {
        updatedQueue.splice(0, updatedQueue.length - ANALYTICS_CONFIG.tracking.maxQueueSize);
      }

      await AsyncStorage.setItem('analytics_offline_queue', JSON.stringify(updatedQueue));
    } catch (error) {
      console.error('[Analytics] Failed to store offline events:', error);
    }
  }

  async retryOfflineEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('analytics_offline_queue');
      if (!stored) return;

      const events = JSON.parse(stored);
      if (events.length === 0) return;

      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.posthog && this.consentGiven) {
        for (const event of events) {
          this.posthog.capture(event.name, event.properties);
        }
        this.posthog.flush();
        await AsyncStorage.removeItem('analytics_offline_queue');
        console.log(`[Analytics] Retried ${events.length} offline events`);
      }
    } catch (error) {
      console.error('[Analytics] Failed to retry offline events:', error);
    }
  }

  identify(userId: string, properties?: UserProperties): void {
    if (!this.consentGiven) return;

    this.userId = userId;

    // Store user data
    AsyncStorage.setItem('analytics_user', JSON.stringify({
      id: userId,
      properties,
    }));

    if (this.posthog) {
      this.posthog.identify(userId, properties);
      this.posthog.register({
        user_id: userId,
        ...properties,
      });
    }

    this.track(ANALYTICS_EVENTS.LOGIN_SUCCESS, {
      user_id: userId,
      ...properties,
    });
  }

  reset(): void {
    if (this.posthog) {
      this.posthog.reset();
    }
    this.userId = null;
    AsyncStorage.removeItem('analytics_user');
    this.track(ANALYTICS_EVENTS.LOGOUT);
  }

  trackFunnel(funnelId: string, step: string, properties?: Record<string, any>): void {
    this.track('funnel_step', {
      funnel_id: funnelId,
      step,
      ...properties,
    });
  }

  trackScreenView(screenName: string, properties?: Record<string, any>): void {
    this.track(ANALYTICS_EVENTS.SCREEN_VIEW, {
      screen: screenName,
      ...properties,
    });
  }

  trackError(error: Error, context?: Record<string, any>): void {
    this.track(ANALYTICS_EVENTS.ERROR_OCCURRED, {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }

  trackPerformance(metric: string, value: number, properties?: Record<string, any>): void {
    this.track(ANALYTICS_EVENTS.PERFORMANCE_METRIC, {
      metric,
      value,
      ...properties,
    });
  }

  async flush(): Promise<void> {
    await this.flushQueue();
  }

  async destroy(): Promise<void> {
    await this.endSession();
    await this.flushQueue();

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.isInitialized = false;
    this.posthog = null;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  isEnabled(): boolean {
    return this.isInitialized && this.consentGiven;
  }

  // Track user properties
  setUserProperty(key: string, value: any): void {
    if (!this.consentGiven || !this.posthog) return;
    this.posthog.register({ [key]: value });
  }

  // Track multiple user properties
  setUserProperties(properties: Record<string, any>): void {
    if (!this.consentGiven || !this.posthog) return;
    this.posthog.register(properties);
  }

  // Feature flags
  getFeatureFlag(key: string): Promise<any> {
    if (!this.consentGiven || !this.posthog) {
      return Promise.resolve(null);
    }
    return Promise.resolve(this.posthog.getFeatureFlag(key) ?? null);
  }

  getFeatureFlags(): Promise<Record<string, any>> {
    if (!this.consentGiven || !this.posthog) {
      return Promise.resolve({});
    }
    return Promise.resolve(this.posthog.getFeatureFlags() ?? {});
  }

  // Reload feature flags
  reloadFeatureFlags(): void {
    if (!this.consentGiven || !this.posthog) return;
    this.posthog.reloadFeatureFlags();
  }
}

export const analyticsService = AnalyticsService.getInstance();