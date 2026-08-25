import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, View, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export function PrivacyOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        setIsVisible(true);
      } else if (nextAppState === 'active') {
        setIsVisible(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.text}>NFTopia</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  text: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
});
