import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Platform,
  DimensionValue,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { Toast as ToastType, ToastPosition, useToastStore } from '@/stores/toastStore';

const { width: screenWidth } = Dimensions.get('window');

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const [pan] = useState(new Animated.ValueXY());
  const [isPressing, setIsPressing] = useState(false);

  const typeConfig = {
    success: {
      backgroundColor: colors.success,
      icon: '✅',
      accessibilityLabel: 'Success',
    },
    error: {
      backgroundColor: colors.error,
      icon: '❌',
      accessibilityLabel: 'Error',
    },
    warning: {
      backgroundColor: colors.warning,
      icon: '⚠️',
      accessibilityLabel: 'Warning',
    },
    info: {
      backgroundColor: colors.info,
      icon: 'ℹ️',
      accessibilityLabel: 'Info',
    },
  };

  const config = typeConfig[toast.type] || typeConfig.info;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 15,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss(toast.id);
        });
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, []);

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < -50) {
          pan.setValue({ x: 0, y: gestureState.dy });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -100) {
          // Dismiss on swipe up
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(pan.y, {
              toValue: -200,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onDismiss(toast.id);
          });
        } else {
          // Reset position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getPositionStyle = (): { top?: DimensionValue; bottom?: DimensionValue } => {
    switch (toast.position) {
      case 'bottom':
        return { bottom: 80 };
      case 'center':
        return { top: '50%' };
      case 'top':
      default:
        return { top: 60 };
    }
  };

  const getTransform = () => {
    const transforms: any[] = [
      {
        translateY: slideAnim,
      },
    ];
    if (pan.y) {
      transforms.push({
        translateY: pan.y,
      });
    }
    return transforms;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getPositionStyle(),
        {
          opacity: fadeAnim,
          transform: getTransform(),
        },
      ]}
      {...panResponder.panHandlers}
      accessibilityRole="alert"
      accessibilityLabel={`${config.accessibilityLabel}: ${toast.message}`}
    >
      <View style={[styles.toast, { backgroundColor: config.backgroundColor }]}>
        <Text style={styles.icon}>{config.icon}</Text>
        <Text style={styles.message} numberOfLines={3}>
          {toast.message}
        </Text>
        {toast.action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              toast.action?.onPress();
              onDismiss(toast.id);
            }}
          >
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </TouchableOpacity>
        )}
        {toast.dismissible !== false && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => {
              Animated.parallel([
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                  toValue: -100,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                onDismiss(toast.id);
              });
            }}
            accessibilityLabel="Dismiss notification"
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    minHeight: 56,
    ...shadows.md,
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  actionButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.sm,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dismissButton: {
    marginLeft: spacing.sm,
    padding: 4,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.8,
  },
});