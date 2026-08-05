import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Environment type definition
export type Environment = 'development' | 'staging' | 'production' | 'test';

// Config interface with all typed values
export interface AppConfig {
  // App Info
  app: {
    name: string;
    version: string;
    environment: Environment;
    isDevelopment: boolean;
    isStaging: boolean;
    isProduction: boolean;
    isTest: boolean;
  };

  // API
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };

  // WebSocket
  websocket: {
    url: string;
  };

  // Analytics
  analytics: {
    enabled: boolean;
    posthogApiKey: string;
    posthogHost: string;
  };

  // Error Tracking
  errorTracking: {
    enabled: boolean;
    sentryDsn: string;
  };

  // Features
  features: {
    biometric: boolean;
    performanceMonitoring: boolean;
    analytics: boolean;
    errorTracking: boolean;
    sessionReplay: boolean;
  };

  // Stellar
  stellar: {
    network: 'testnet' | 'public';
    horizonUrl: string;
  };

  // Deep Linking
  deepLinking: {
    scheme: string;
    host: string;
  };

  // Security
  security: {
    encryptionKey: string;
  };
}

// Secure storage keys
const SECURE_KEYS = {
  ENCRYPTION_KEY: 'config_encryption_key',
  API_TOKEN: 'config_api_token',
};

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;
  private secureValues: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  // Initialize config from environment variables
  initialize(): AppConfig {
    if (this.config) {
      return this.config;
    }

    const environment = (process.env.EXPO_PUBLIC_APP_ENVIRONMENT ||
      Constants.expoConfig?.extra?.environment ||
      'development') as Environment;

    const config: AppConfig = {
      app: {
        name: process.env.EXPO_PUBLIC_APP_NAME || 'NFTopia',
        version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
        environment,
        isDevelopment: environment === 'development',
        isStaging: environment === 'staging',
        isProduction: environment === 'production',
        isTest: environment === 'test',
      },
      api: {
        baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.nftopia.io/v1',
        timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
        retryAttempts: parseInt(process.env.EXPO_PUBLIC_API_RETRY_ATTEMPTS || '3', 10),
      },
      websocket: {
        url: process.env.EXPO_PUBLIC_WS_URL || 'wss://api.nftopia.io/ws/notifications',
      },
      analytics: {
        enabled: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS !== 'false',
        posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '',
        posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      },
      errorTracking: {
        enabled: process.env.EXPO_PUBLIC_ENABLE_ERROR_TRACKING !== 'false',
        sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      },
      features: {
        biometric: process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC !== 'false',
        performanceMonitoring: process.env.EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING !== 'false',
        analytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS !== 'false',
        errorTracking: process.env.EXPO_PUBLIC_ENABLE_ERROR_TRACKING !== 'false',
        sessionReplay: process.env.EXPO_PUBLIC_ENABLE_SESSION_REPLAY === 'true',
      },
      stellar: {
        network: (process.env.EXPO_PUBLIC_STELLAR_NETWORK as 'testnet' | 'public') || 'testnet',
        horizonUrl: process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL ||
          'https://horizon-testnet.stellar.org',
      },
      deepLinking: {
        scheme: process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME || 'nftopia',
        host: process.env.EXPO_PUBLIC_DEEP_LINK_HOST || 'nftopia.io',
      },
      security: {
        encryptionKey: process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'default-key',
      },
    };

    this.config = config;
    this.validateConfig(config);
    this.logConfig(config);

    // Load secure values
    this.loadSecureValues();

    return config;
  }

  // Validate config values
  private validateConfig(config: AppConfig): void {
    const errors: string[] = [];

    // Required values for production
    if (config.app.isProduction) {
      if (!config.analytics.posthogApiKey) {
        errors.push('PostHog API key is required in production');
      }
      if (!config.errorTracking.sentryDsn) {
        errors.push('Sentry DSN is required in production');
      }
      if (!config.api.baseUrl || config.api.baseUrl.includes('localhost')) {
        errors.push('API base URL must be valid in production');
      }
    }

    // Required values for all environments
    if (!config.api.baseUrl) {
      errors.push('API base URL is required');
    }
    if (!config.websocket.url) {
      errors.push('WebSocket URL is required');
    }

    if (errors.length > 0) {
      console.warn('[Config] Validation warnings:', errors.join(', '));
    }
  }

  // Log config state
  private logConfig(config: AppConfig): void {
    const logData = {
      environment: config.app.environment,
      version: config.app.version,
      api: {
        baseUrl: config.api.baseUrl,
        timeout: config.api.timeout,
      },
      features: config.features,
      stellar: {
        network: config.stellar.network,
        horizonUrl: config.stellar.horizonUrl,
      },
      deepLinking: {
        scheme: config.deepLinking.scheme,
        host: config.deepLinking.host,
      },
    };

    // Mask sensitive values
    console.log('[Config] Loaded:', JSON.stringify(logData, null, 2));
  }

  // Get config
  getConfig(): AppConfig {
    if (!this.config) {
      this.initialize();
    }
    return this.config!;
  }

  // Get specific config value
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.getConfig()[key];
  }

  // Get feature flag
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.getConfig().features[feature];
  }

  // Get environment
  getEnvironment(): Environment {
    return this.getConfig().app.environment;
  }

  // Check if production
  isProduction(): boolean {
    return this.getConfig().app.isProduction;
  }

  // Check if development
  isDevelopment(): boolean {
    return this.getConfig().app.isDevelopment;
  }

  // Secure storage methods
  async setSecureValue(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
      this.secureValues.set(key, value);
    } catch (error) {
      console.error('[Config] Failed to set secure value:', error);
    }
  }

  async getSecureValue(key: string): Promise<string | null> {
    try {
      // Check cache first
      if (this.secureValues.has(key)) {
        return this.secureValues.get(key) || null;
      }

      const value = await SecureStore.getItemAsync(key);
      if (value) {
        this.secureValues.set(key, value);
      }
      return value;
    } catch (error) {
      console.error('[Config] Failed to get secure value:', error);
      return null;
    }
  }

  async removeSecureValue(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      this.secureValues.delete(key);
    } catch (error) {
      console.error('[Config] Failed to remove secure value:', error);
    }
  }

  private async loadSecureValues(): Promise<void> {
    // Load encryption key if not in environment
    const encryptionKey = await this.getSecureValue(SECURE_KEYS.ENCRYPTION_KEY);
    if (encryptionKey && this.config) {
      this.config.security.encryptionKey = encryptionKey;
    }
  }

  // Reload config (for testing)
  reload(): void {
    this.config = null;
    this.initialize();
  }

  // Get config as JSON
  toJSON(): Record<string, any> {
    const config = this.getConfig();
    return {
      app: {
        name: config.app.name,
        version: config.app.version,
        environment: config.app.environment,
        isDevelopment: config.app.isDevelopment,
        isProduction: config.app.isProduction,
      },
      api: {
        baseUrl: config.api.baseUrl,
        timeout: config.api.timeout,
      },
      features: config.features,
      stellar: {
        network: config.stellar.network,
      },
      deepLinking: {
        scheme: config.deepLinking.scheme,
        host: config.deepLinking.host,
      },
    };
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

// Export typed config for direct use
export const config = configManager.getConfig();

// Export individual config sections for convenience
export const appConfig = config.app;
export const apiConfig = config.api;
export const websocketConfig = config.websocket;
export const analyticsConfig = config.analytics;
export const errorTrackingConfig = config.errorTracking;
export const featuresConfig = config.features;
export const stellarConfig = config.stellar;
export const deepLinkingConfig = config.deepLinking;
export const securityConfig = config.security;

// Export config manager functions
export const getConfig = () => configManager.getConfig();
export const getEnvironment = () => configManager.getEnvironment();
export const isProduction = () => configManager.isProduction();
export const isDevelopment = () => configManager.isDevelopment();
export const isFeatureEnabled = (feature: keyof AppConfig['features']) =>
  configManager.isFeatureEnabled(feature);
export const getSecureValue = (key: string) => configManager.getSecureValue(key);
export const setSecureValue = (key: string, value: string) =>
  configManager.setSecureValue(key, value);
export const removeSecureValue = (key: string) => configManager.removeSecureValue(key);
export const reloadConfig = () => configManager.reload();