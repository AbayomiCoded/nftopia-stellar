import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  DimensionValue,
  StyleProp,
} from 'react-native';
import { colors, borderRadius as themeBorderRadius } from '@/constants/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  backgroundColor?: string;
  highlightColor?: string;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
  duration?: number;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = themeBorderRadius.sm,
  backgroundColor = colors.border,
  highlightColor = '#f0f0f0',
  style,
  animated = true,
  duration = 1200,
  children,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animated, duration, animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.6, 1],
  });

  const animatedStyle = animated
    ? {
        opacity: opacity,
        backgroundColor: animatedValue.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [backgroundColor, highlightColor, backgroundColor],
        }),
      }
    : { backgroundColor };

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});