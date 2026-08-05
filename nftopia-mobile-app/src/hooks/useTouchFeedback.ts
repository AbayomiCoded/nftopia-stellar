import { useRef, useCallback } from 'react';
import { Animated, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface TouchFeedbackOptions {
  scale?: boolean;
  opacity?: boolean;
  haptic?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  scaleTo?: number;
  opacityTo?: number;
  duration?: number;
}

export function useTouchFeedback(options: TouchFeedbackOptions = {}) {
  const {
    scale = true,
    opacity = true,
    haptic = false,
    hapticStyle = 'light',
    scaleTo = 0.95,
    opacityTo = 0.7,
    duration = 150,
  } = options;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (haptic) {
      switch (hapticStyle) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    }

    const animations: Animated.CompositeAnimation[] = [];

    if (scale) {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: scaleTo,
          useNativeDriver: true,
          speed: 50,
          bounciness: 5,
        })
      );
    }

    if (opacity) {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: opacityTo,
          duration: duration,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  }, [haptic, hapticStyle, scale, opacity, scaleTo, opacityTo, duration, scaleAnim, opacityAnim]);

  const handlePressOut = useCallback(() => {
    const animations: Animated.CompositeAnimation[] = [];

    if (scale) {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 5,
        })
      );
    }

    if (opacity) {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration * 1.2,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  }, [scale, opacity, duration, scaleAnim, opacityAnim]);

  const getAnimatedStyle = useCallback(() => {
    const style: any = {};
    if (scale) {
      style.transform = [{ scale: scaleAnim }];
    }
    if (opacity) {
      style.opacity = opacityAnim;
    }
    return style;
  }, [scale, opacity, scaleAnim, opacityAnim]);

  return {
    scaleAnim,
    opacityAnim,
    handlePressIn,
    handlePressOut,
    getAnimatedStyle,
  };
}