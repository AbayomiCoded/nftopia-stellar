import { useState, useCallback, useEffect } from 'react';
import { biometricService, BiometricConfig, BIOMETRIC_CONFIGS } from '@/src/services/biometric.service';
import { analyticsService } from '@/src/analytics/analytics.service';
import { errorLogger } from '@/src/errors/logger';

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Check biometric status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await biometricService.getStatus();
      setIsAvailable(status.isAvailable);
      setIsEnrolled(status.isEnrolled);
      setHasSavedCredentials(status.hasSavedCredentials);
    } catch (error) {
      errorLogger.log(error as Error, 'useBiometric.checkStatus');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authenticate = useCallback(
    async (
      action: keyof typeof BIOMETRIC_CONFIGS,
      options?: Partial<BiometricConfig>
    ): Promise<boolean> => {
      try {
        const config = {
          ...BIOMETRIC_CONFIGS[action],
          ...options,
        } as BiometricConfig;

        const result = await biometricService.authenticate(config);

        if (result.success) {
          analyticsService.track('biometric_auth_success', {
            action,
            hasSavedCredentials: hasSavedCredentials,
          });
          return true;
        }

        analyticsService.track('biometric_auth_failure', {
          action,
          error: result.error,
          reason: result.reason,
        });

        return false;
      } catch (error) {
        errorLogger.log(error as Error, 'useBiometric.authenticate');
        analyticsService.track('biometric_auth_error', {
          action,
          error: (error as Error).message,
        });
        return false;
      }
    },
    [hasSavedCredentials]
  );

  const authenticateWithFallback = useCallback(
    async (
      action: keyof typeof BIOMETRIC_CONFIGS,
      options?: Partial<BiometricConfig>
    ): Promise<boolean> => {
      try {
        const config = {
          ...BIOMETRIC_CONFIGS[action],
          ...options,
        } as BiometricConfig;

        const result = await biometricService.authenticateWithFallback(config);

        if (result.success) {
          analyticsService.track('biometric_fallback_success', { action });
          return true;
        }

        analyticsService.track('biometric_fallback_failure', {
          action,
          error: result.error,
          reason: result.reason,
        });

        return false;
      } catch (error) {
        errorLogger.log(error as Error, 'useBiometric.authenticateWithFallback');
        analyticsService.track('biometric_fallback_error', {
          action,
          error: (error as Error).message,
        });
        return false;
      }
    },
    []
  );

  const requireBiometric = useCallback(
    async (
      action: keyof typeof BIOMETRIC_CONFIGS,
      onSuccess: () => void | Promise<void>,
      onFailure?: () => void,
      options?: Partial<BiometricConfig>
    ): Promise<void> => {
      // Check if biometrics are available
      if (!isAvailable || !isEnrolled) {
        analyticsService.track('biometric_not_available', {
          action,
          isAvailable,
          isEnrolled,
        });
        if (onFailure) onFailure();
        return;
      }

      // Check if biometrics are enabled
      const enabled = await biometricService.getBiometricPreference();
      if (!enabled) {
        analyticsService.track('biometric_disabled', { action });
        if (onFailure) onFailure();
        return;
      }

      // Check cooldown
      const cooldown = biometricService.getCooldownRemaining();
      if (cooldown > 0) {
        analyticsService.track('biometric_cooldown_check', {
          action,
          cooldownRemaining: cooldown,
        });
        if (onFailure) onFailure();
        return;
      }

      const success = await authenticate(action, options);
      if (success) {
        await onSuccess();
      } else {
        if (onFailure) onFailure();
      }
    },
    [isAvailable, isEnrolled, authenticate]
  );

  const requireBiometricWithFallback = useCallback(
    async (
      action: keyof typeof BIOMETRIC_CONFIGS,
      onSuccess: () => void | Promise<void>,
      onFailure?: () => void,
      options?: Partial<BiometricConfig>
    ): Promise<void> => {
      // Check if biometrics are available
      if (!isAvailable || !isEnrolled) {
        analyticsService.track('biometric_fallback_not_available', {
          action,
          isAvailable,
          isEnrolled,
        });
        if (onFailure) onFailure();
        return;
      }

      // Check if biometrics are enabled
      const enabled = await biometricService.getBiometricPreference();
      if (!enabled) {
        analyticsService.track('biometric_fallback_disabled', { action });
        if (onFailure) onFailure();
        return;
      }

      const success = await authenticateWithFallback(action, options);
      if (success) {
        await onSuccess();
      } else {
        if (onFailure) onFailure();
      }
    },
    [isAvailable, isEnrolled, authenticateWithFallback]
  );

  const enableBiometric = useCallback(async (enabled: boolean): Promise<void> => {
    await biometricService.saveBiometricPreference(enabled);
    analyticsService.track('biometric_enabled_changed', { enabled });
  }, []);

  const isBiometricEnabled = useCallback(async (): Promise<boolean> => {
    return await biometricService.getBiometricPreference();
  }, []);

  const getCooldownRemaining = useCallback((): number => {
    return biometricService.getCooldownRemaining();
  }, []);

  const resetCooldown = useCallback((): void => {
    biometricService.resetCooldown();
  }, []);

  const getFailedAttempts = useCallback((): number => {
    return biometricService.getFailedAttempts();
  }, []);

  const getMaxFailures = useCallback((): number => {
    return biometricService.getMaxFailures();
  }, []);

  const refreshStatus = useCallback(async () => {
    await checkStatus();
  }, [checkStatus]);

  return {
    isAvailable,
    isEnrolled,
    hasSavedCredentials,
    isLoading,
    cooldownRemaining: getCooldownRemaining(),
    authenticate,
    authenticateWithFallback,
    requireBiometric,
    requireBiometricWithFallback,
    enableBiometric,
    isBiometricEnabled,
    getCooldownRemaining,
    resetCooldown,
    getFailedAttempts,
    getMaxFailures,
    refreshStatus,
  };
}