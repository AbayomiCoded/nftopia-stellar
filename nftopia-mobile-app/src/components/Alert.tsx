import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useToastStore, Alert as AlertData } from '@/stores/toastStore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AlertItemProps {
  alert: AlertData;
  onDismiss: (id: string) => void;
}

function AlertItem({ alert, onDismiss }: AlertItemProps) {
  const [visible, setVisible] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  const typeConfig = {
    success: { icon: '✅', color: colors.success },
    error: { icon: '❌', color: colors.error },
    warning: { icon: '⚠️', color: colors.warning },
    info: { icon: 'ℹ️', color: colors.info },
  };

  const config = alert.type ? typeConfig[alert.type] : typeConfig.info;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 15,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (callback) callback();
      onDismiss(alert.id);
    });
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        if (alert.dismissible !== false) {
          handleClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.alert}>
            <View style={styles.header}>
              {config.icon && <Text style={styles.icon}>{config.icon}</Text>}
              <Text style={styles.title}>{alert.title}</Text>
              {alert.dismissible !== false && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => handleClose()}
                  accessibilityLabel="Close alert"
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.message}>{alert.message}</Text>

            <View style={styles.actions}>
              {alert.actions.map((action: AlertData['actions'][number], index: number) => {
                const isDestructive = action.style === 'destructive';
                const isCancel = action.style === 'cancel';
                const isPrimary = !isDestructive && !isCancel;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionButton,
                      isPrimary && styles.primaryAction,
                      isDestructive && styles.destructiveAction,
                      isCancel && styles.cancelAction,
                      alert.actions.length === 1 && styles.fullWidthAction,
                    ]}
                    onPress={() => {
                      if (action.onPress) {
                        action.onPress();
                      }
                      handleClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        isPrimary && styles.primaryActionText,
                        isDestructive && styles.destructiveActionText,
                        isCancel && styles.cancelActionText,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function AlertContainer() {
  const { alerts, dismissAlert } = useToastStore();

  if (alerts.length === 0) return null;

  return (
    <>
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onDismiss={dismissAlert} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.8,
  },
  alert: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
    marginLeft: spacing.sm,
  },
  closeText: {
    fontSize: 18,
    color: colors.textTertiary,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 80,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthAction: {
    flex: 1,
    width: '100%',
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  destructiveAction: {
    backgroundColor: colors.error,
  },
  cancelAction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
  destructiveActionText: {
    color: '#FFFFFF',
  },
  cancelActionText: {
    color: colors.text,
  },
});