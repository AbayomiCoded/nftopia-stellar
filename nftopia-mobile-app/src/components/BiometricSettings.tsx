import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useBiometric } from '@/src/hooks/useBiometric';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface BiometricSettingsProps {
  onToggle?: (enabled: boolean) => void;
  initiallyEnabled?: boolean;
}

export function BiometricSettings({
  onToggle,
  initiallyEnabled = false,
}: BiometricSettingsProps) {
  const {
    isAvailable,
    isEnrolled,
    isLoading,
    enableBiometric,
    isBiometricEnabled,
    refreshStatus,
  } = useBiometric();

  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [isToggling, setIsToggling] = useState(false);

  // Load saved preference
  useEffect(() => {
    const loadPreference = async () => {
      const saved = await isBiometricEnabled();
      setEnabled(saved);
    };
    loadPreference();
  }, []);

  const handleToggle = async (value: boolean) => {
    if (!isAvailable || !isEnrolled) {
      Alert.alert(
        'Biometric Not Available',
        'Please set up fingerprint or face recognition on your device first.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsToggling(true);
    try {
      await enableBiometric(value);
      setEnabled(value);
      if (onToggle) onToggle(value);

      if (value) {
        Alert.alert(
          'Biometric Enabled',
          'You will now be prompted for biometric authentication for sensitive actions.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update biometric settings.');
    } finally {
      setIsToggling(false);
    }
  };

  const getStatusText = () => {
    if (!isAvailable) return 'Not available';
    if (!isEnrolled) return 'Not enrolled';
    return enabled ? 'Enabled' : 'Disabled';
  };

  const getStatusColor = () => {
    if (!isAvailable || !isEnrolled) return colors.error;
    return enabled ? colors.success : colors.textSecondary;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Biometric Authentication</Text>
          <Text style={styles.description}>
            Use fingerprint or face recognition for sensitive actions
          </Text>
        </View>
        <View style={styles.switchContainer}>
          {isToggling ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={enabled && isAvailable && isEnrolled}
              onValueChange={handleToggle}
              trackColor={{ false: '#E0E0E0', true: '#6C5CE7' }}
              thumbColor="#FFFFFF"
              disabled={isToggling || !isAvailable || !isEnrolled}
            />
          )}
        </View>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={[styles.statusValue, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {!isAvailable && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Biometric authentication is not available on this device.
          </Text>
        </View>
      )}

      {isAvailable && !isEnrolled && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Please set up fingerprint or face recognition in your device settings.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshStatus}>
            <Text style={styles.refreshButtonText}>Check Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {enabled && isAvailable && isEnrolled && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            ✅ Biometric authentication is enabled. You will be prompted for:
          </Text>
          <Text style={styles.infoItem}>• Wallet access and export</Text>
          <Text style={styles.infoItem}>• Transaction confirmations</Text>
          <Text style={styles.infoItem}>• Security settings changes</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.refreshStatusButton}
        onPress={refreshStatus}
        disabled={isLoading}
      >
        <Text style={styles.refreshStatusText}>Refresh Status</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  switchContainer: {
    justifyContent: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: colors.warningBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  warningText: {
    color: colors.warningText,
    fontSize: 13,
    lineHeight: 18,
  },
  refreshButton: {
    marginTop: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.warning,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  infoText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoItem: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingLeft: spacing.md,
    paddingVertical: 2,
  },
  refreshStatusButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  refreshStatusText: {
    color: colors.info,
    fontSize: 13,
    fontWeight: '500',
  },
  shadows: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});