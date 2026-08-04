import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

export interface EnhancedRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
  title?: string;
  titleColor?: string;
  progressBackgroundColor?: string;
  pullDistance?: number;
  onPullDistanceChange?: (distance: number) => void;
}

export function EnhancedRefreshControl({
  refreshing,
  onRefresh,
  tintColor = '#6C5CE7',
  title = 'Pull to refresh',
  titleColor = colors.textSecondary,
  progressBackgroundColor = colors.background,
  pullDistance = 0,
  onPullDistanceChange,
}: EnhancedRefreshControlProps) {
  const [progress] = useState(new Animated.Value(0));
  const [scale] = useState(new Animated.Value(0));

  useEffect(() => {
    if (refreshing) {
      // Animate progress to full
      Animated.timing(progress, {
        toValue: 1,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();

      // Scale up
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation
      Animated.timing(progress, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.spring(scale, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [refreshing, progress, scale]);

  // Update pull distance
  useEffect(() => {
    if (onPullDistanceChange) {
      onPullDistanceChange(pullDistance);
    }
  }, [pullDistance, onPullDistanceChange]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  const progressOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const scaleValue = scale.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  // Pull distance indicator
  const pullPercentage = Math.min(pullDistance / 120, 1);
  const pullOpacity = pullPercentage > 0 ? 1 : 0;

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      colors={[tintColor]}
      progressBackgroundColor={progressBackgroundColor}
      title={title}
      titleColor={titleColor}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 40,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  pullIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pullBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  pullFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 2,
  },
});