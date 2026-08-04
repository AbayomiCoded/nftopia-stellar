import { useRef, useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

export interface PageTransitionOptions {
  duration?: number;
  delay?: number;
  type?: 'fade' | 'slide' | 'scale' | 'none';
  direction?: 'left' | 'right' | 'top' | 'bottom';
}

export function usePageTransition(options: PageTransitionOptions = {}) {
  const {
    duration = 300,
    delay = 0,
    type = 'fade',
    direction = 'right',
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const enter = () => {
    setIsVisible(true);
    Animated.timing(animValue, {
      toValue: 1,
      duration: duration,
      delay: delay,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const exit = (callback?: () => void) => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (isMounted.current) {
        setIsVisible(false);
        if (callback) callback();
      }
    });
  };

  const getAnimatedStyle = () => {
    const opacity = type === 'none' ? 1 : animValue;
    let transform: any = [];

    if (type === 'slide') {
      const translate = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0],
      });
      transform = [{ translateX: translate }];
    } else if (type === 'scale') {
      const scale = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1],
      });
      transform = [{ scale }];
    }

    return {
      opacity: opacity as Animated.AnimatedInterpolation<number>,
      transform,
    };
  };

  const reset = () => {
    animValue.setValue(0);
    setIsVisible(false);
  };

  return {
    isVisible,
    enter,
    exit,
    reset,
    animValue,
    getAnimatedStyle,
    animatedStyle: getAnimatedStyle(),
  };
}