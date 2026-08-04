import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { analyticsService } from '@/src/analytics/analytics.service';
import { errorLogger } from '@/src/errors/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiometricConfig {
  title: string;
  subtitle?: string;
  description?: string;
  fallbackLabel?: string;
  cancelLabel?: string;
  disableDeviceFallback?: boolean;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
  reason?: string;
}

export interface BiometricStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: string[];
  hasHardware: boolean;
  hasSavedCredentials: boolean;
}

export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'faceId',
  IRIS = 'iris',
  PIN = 'pin',
}

export const BIOMETRIC_CONFIGS = {
  WALLET_ACCESS: {
    title: 'Authenticate to Access Wallet',
    subtitle: 'Verify your identity to view wallet details',
    description: 'Biometric authentication required for wallet access',
  },
  TRANSACTION_CONFIRM: {
    title: 'Confirm Transaction',
    subtitle: 'Verify your identity to complete this transaction',
    description: 'Biometric authentication required for transactions',
  },
  EXPORT_WALLET: {
    title: 'Export Wallet',
    subtitle: 'Verify your identity to export wallet keys',
    description: 'Biometric authentication required for wallet export',
  },
  SETTINGS_CHANGE: {
    title: 'Change Settings',
    subtitle: 'Verify your identity to change security settings',
    description: 'Biometric authentication required for settings changes',
  },
  PASSWORD_CHANGE: {
    title: 'Change Password',
    subtitle: 'Verify your identity to change your password',
    description: 'Biometric authentication required for password changes',
  },
};

class BiometricService {
  private static instance: BiometricService;
  private consecutiveFailures = 0;
  private maxFailures = 5;
  private cooldownEndTime: number | null = null;
  private readonly COOLDOWN_DURATION = 300000; // 5 minutes

  private constructor() {}

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  // Check if biometrics are available and enrolled
  async getStatus(): Promise<BiometricStatus> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // Check if we have saved credentials (biometric or PIN)
      const hasSavedCredentials = await this.hasSavedCredentials();

      return {
        isAvailable: hasHardware && isEnrolled,
        isEnrolled,
        supportedTypes: supportedTypes.map((type) => {
          switch (type) {
            case LocalAuthentication.AuthenticationType.FINGERPRINT:
              return BiometricType.FINGERPRINT;
            case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
              return BiometricType.FACE_ID;
            case LocalAuthentication.AuthenticationType.IRIS:
              return BiometricType.IRIS;
            default:
              return BiometricType.PIN;
          }
        }),
        hasHardware,
        hasSavedCredentials,
      };
    } catch (error) {
      errorLogger.log(error as Error, 'BiometricService.getStatus');
      return {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: [],
        hasHardware: false,
        hasSavedCredentials: false,
      };
    }
  }

  // Check if biometrics are available for use
  async isAvailable(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isAvailable;
  }

  // Check if user has biometrics enrolled
  async isEnrolled(): Promise<boolean> {
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch (error) {
      errorLogger.log(error as Error, 'BiometricService.isEnrolled');
      return false;
    }
  }

  // Check if we're in cooldown period
  private isInCooldown(): boolean {
    if (!this.cooldownEndTime) return false;
    if (Date.now() > this.cooldownEndTime) {
      this.cooldownEndTime = null;
      this.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  // Get remaining cooldown time in seconds
  getCooldownRemaining(): number {
    if (!this.cooldownEndTime) return 0;
    const remaining = Math.ceil((this.cooldownEndTime - Date.now()) / 1000);
    return Math.max(0, remaining);
  }

  // Authenticate with biometrics
  async authenticate(
    config: BiometricConfig
  ): Promise<BiometricResult> {
    const startTime = Date.now();

    try {
      // Check cooldown
      if (this.isInCooldown()) {
        const remaining = this.getCooldownRemaining();
        return {
          success: false,
          error: `Too many failed attempts. Please try again in ${remaining} seconds.`,
          reason: 'cooldown',
        };
      }

      // Check if biometrics are available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device.',
          reason: 'unavailable',
        };
      }

      // Get supported types for display
      const status = await this.getStatus();
      const authType = status.supportedTypes.join(', ');

      // Create options with fallback
      const options = {
        promptMessage: config.title,
        fallbackLabel: config.fallbackLabel || 'Use PIN/Password',
        cancelLabel: config.cancelLabel || 'Cancel',
        disableDeviceFallback: config.disableDeviceFallback || false,
      };

      // Attempt authentication
      const result = await LocalAuthentication.authenticateAsync(options);

      // Track result
      const duration = Date.now() - startTime;
      analyticsService.track('biometric_attempt', {
        success: result.success,
        type: authType,
        duration,
        hasError: !result.success,
        error: !result.success ? result.error : undefined,
      });

      if (result.success) {
        // Reset failure count on success
        this.consecutiveFailures = 0;
        this.cooldownEndTime = null;
        return { success: true };
      } else {
        // Track failure
        this.consecutiveFailures++;

        // Check if we've reached max failures
        if (this.consecutiveFailures >= this.maxFailures) {
          this.cooldownEndTime = Date.now() + this.COOLDOWN_DURATION;
          analyticsService.track('biometric_cooldown_activated', {
            failures: this.consecutiveFailures,
            cooldownDuration: this.COOLDOWN_DURATION,
          });
          return {
            success: false,
            error: `Too many failed attempts. Please try again in ${this.getCooldownRemaining()} seconds.`,
            reason: 'cooldown',
          };
        }

        return {
          success: false,
          error: result.error || 'Authentication failed.',
          reason: 'failed',
        };
      }
    } catch (error) {
      errorLogger.log(error as Error, 'BiometricService.authenticate');
      analyticsService.track('biometric_error', {
        error: (error as Error).message,
        config,
      });
      return {
        success: false,
        error: 'An error occurred during authentication.',
        reason: 'error',
      };
    }
  }

  // Authenticate with fallback to PIN
  async authenticateWithFallback(
    config: BiometricConfig
  ): Promise<BiometricResult> {
    const result = await this.authenticate({
      ...config,
      disableDeviceFallback: false,
    });

    if (result.success) {
      return result;
    }

    // If biometrics failed, try with device fallback (PIN/Password)
    try {
      const options = {
        promptMessage: 'Use PIN/Password',
        fallbackLabel: 'Cancel',
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
      };

      const fallbackResult = await LocalAuthentication.authenticateAsync(options);

      analyticsService.track('biometric_fallback_used', {
        success: fallbackResult.success,
        previousError: result.error,
      });

      if (fallbackResult.success) {
        this.consecutiveFailures = 0;
        this.cooldownEndTime = null;
        return { success: true };
      }

      return {
        success: false,
        error: 'Authentication failed with both biometrics and PIN.',
        reason: 'both_failed',
      };
    } catch (error) {
      errorLogger.log(error as Error, 'BiometricService.authenticateWithFallback');
      return {
        success: false,
        error: 'Fallback authentication failed.',
        reason: 'fallback_failed',
      };
    }
  }

  // Save biometric preference
  async saveBiometricPreference(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem('biometric_enabled', JSON.stringify(enabled));
      analyticsService.track('biometric_preference_changed', { enabled });
    } catch (error) {
      errorLogger.log(error as Error, 'BiometricService.saveBiometricPreference');
    }
  }

  // Get biometric preference
  async getBiometricPreference(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem('biometric_enabled');
      return value ? JSON.parse(value) : false;
    } catch (error) {
      errorLogger.log(error as Error, 'BiometricService.getBiometricPreference');
      return false;
    }
  }

  // Save saved credentials flag
  async saveSavedCredentials(): Promise<void> {
    try {
      await AsyncStorage.setItem('biometric_has_credentials', 'true');
    } catch (error) {
      errorLogger.log(error as Error, 'BiometricService.saveSavedCredentials');
    }
  }

  // Check if we have saved credentials
  async hasSavedCredentials(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem('biometric_has_credentials');
      return value === 'true';
    } catch (error) {
      errorLogger.log(error as Error, 'BiometricService.hasSavedCredentials');
      return false;
    }
  }

  // Clear saved credentials
  async clearSavedCredentials(): Promise<void> {
    try {
      await AsyncStorage.removeItem('biometric_has_credentials');
    } catch (error) {
      errorLogger.log(error as Error, 'BiometricService.clearSavedCredentials');
    }
  }

  // Reset cooldown
  resetCooldown(): void {
    this.cooldownEndTime = null;
    this.consecutiveFailures = 0;
  }

  // Get failed attempts count
  getFailedAttempts(): number {
    return this.consecutiveFailures;
  }

  // Get max failures before cooldown
  getMaxFailures(): number {
    return this.maxFailures;
  }

  // Set max failures (for configuration)
  setMaxFailures(max: number): void {
    this.maxFailures = max;
  }
}

export const biometricService = BiometricService.getInstance();