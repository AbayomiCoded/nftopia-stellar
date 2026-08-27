import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface ConnectivityBannerProps {
  onRetry?: () => void;
}

export function ConnectivityBanner({ onRetry }: ConnectivityBannerProps) {
  const { isOffline, justWentOffline, justCameOnline, manualCheck, isChecking } = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const prevOffline = useRef(isOffline);

  useEffect(() => {
    // Announce connectivity changes for screen readers
    if (justWentOffline) {
      AccessibilityInfo.announceForAccessibility('You are offline. Please check your internet connection.');
    } else if (justCameOnline) {
      AccessibilityInfo.announceForAccessibility('You are back online.');
    }
  }, [justWentOffline, justCameOnline]);

  useEffect(() => {
    if (isOffline && !prevOffline.current) {
      // Show banner when going offline
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else if (!isOffline && prevOffline.current) {
      // Hide banner when coming back online
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    prevOffline.current = isOffline;
  }, [isOffline, slideAnim]);

  const handleRetry = async () => {
    await manualCheck();
    if (onRetry) {
      onRetry();
    }
  };

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessible={true}
      accessibilityLiveRegion="assertive"
      accessibilityLabel="Offline mode banner"
      accessibilityHint="You are currently offline. Tap retry to check connection."
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📡</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>You're Offline</Text>
          <Text style={styles.message}>Please check your internet connection</Text>
        </View>
        <TouchableOpacity
          style={[styles.retryButton, isChecking && styles.retryButtonDisabled]}
          onPress={handleRetry}
          disabled={isChecking}
          accessibilityLabel="Retry connection"
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>{isChecking ? 'Checking...' : 'Retry'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.warning,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  retryButton: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
