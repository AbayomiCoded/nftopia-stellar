import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useBiometric } from '@/src/hooks/useBiometric';
import { BIOMETRIC_CONFIGS } from '@/src/services/biometric.service';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface BiometricConfirmationDialogProps {
  visible: boolean;
  action: keyof typeof BIOMETRIC_CONFIGS;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
  onFailure?: () => void;
  destructive?: boolean;
  requireFallback?: boolean;
}

export function BiometricConfirmationDialog({
  visible,
  action,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  onSuccess,
  onFailure,
  destructive = false,
  requireFallback = true,
}: BiometricConfirmationDialogProps) {
  const {
    isAvailable,
    isEnrolled,
    cooldownRemaining,
    requireBiometric,
    requireBiometricWithFallback,
    getFailedAttempts,
    getMaxFailures,
    resetCooldown,
  } = useBiometric();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (visible) {
      setErrorMessage(null);
      setIsAuthenticating(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    // Check if biometrics are available
    if (!isAvailable || !isEnrolled) {
      setErrorMessage('Biometric authentication is not available on this device.');
      if (onFailure) onFailure();
      return;
    }

    // Check cooldown
    if (cooldownRemaining > 0) {
      setErrorMessage(`Too many failed attempts. Please try again in ${cooldownRemaining} seconds.`);
      if (onFailure) onFailure();
      return;
    }

    try {
      setIsAuthenticating(true);
      setErrorMessage(null);

      const success = requireFallback
        ? await requireBiometricWithFallback(
            action,
            async () => {
              // On success
              setIsAuthenticating(false);
              if (onSuccess) onSuccess();
              // Call the original onConfirm
              await onConfirm();
            },
            () => {
              // On failure
              setIsAuthenticating(false);
              setErrorMessage('Authentication failed. Please try again.');
              if (onFailure) onFailure();
            }
          )
        : await requireBiometric(
            action,
            async () => {
              // On success
              setIsAuthenticating(false);
              if (onSuccess) onSuccess();
              await onConfirm();
            },
            () => {
              // On failure
              setIsAuthenticating(false);
              setErrorMessage('Authentication failed. Please try again.');
              if (onFailure) onFailure();
            }
          );
    } catch (error) {
      setIsAuthenticating(false);
      setErrorMessage('An error occurred during authentication.');
      if (onFailure) onFailure();
    }
  };

  const getActionConfig = () => {
    const config = BIOMETRIC_CONFIGS[action];
    return {
      title: title || config.title,
      subtitle: config.subtitle,
      description: config.description,
    };
  };

  const actionConfig = getActionConfig();
  const failedAttempts = getFailedAttempts();
  const maxFailures = getMaxFailures();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <Text style={styles.title}>{actionConfig.title}</Text>
          {actionConfig.subtitle && (
            <Text style={styles.subtitle}>{actionConfig.subtitle}</Text>
          )}
          {message && <Text style={styles.message}>{message}</Text>}

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {cooldownRemaining > 0 && (
            <View style={styles.cooldownContainer}>
              <Text style={styles.cooldownText}>
                ⏳ Cooldown: {cooldownRemaining}s remaining
              </Text>
              <TouchableOpacity
                style={styles.resetCooldownButton}
                onPress={() => {
                  resetCooldown();
                  setErrorMessage(null);
                }}
              >
                <Text style={styles.resetCooldownText}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}

          {failedAttempts > 0 && !cooldownRemaining && (
            <Text style={styles.attemptsText}>
              Attempts: {failedAttempts}/{maxFailures}
            </Text>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isAuthenticating}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                destructive && styles.confirmDestructive,
                (isAuthenticating || cooldownRemaining > 0) && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={isAuthenticating || cooldownRemaining > 0}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text
                  style={[
                    styles.confirmText,
                    destructive && styles.confirmTextDestructive,
                  ]}
                >
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            {isAvailable && isEnrolled
              ? 'Use fingerprint or face recognition to confirm'
              : 'Biometric authentication not available'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    ...shadows.md,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  cooldownContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.warningBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  cooldownText: {
    color: colors.warningText,
    fontSize: 14,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  resetCooldownButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.warning,
    borderRadius: borderRadius.sm,
  },
  resetCooldownText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  attemptsText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmDestructive: {
    backgroundColor: colors.error,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textInverse,
  },
  confirmTextDestructive: {
    color: colors.textInverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});