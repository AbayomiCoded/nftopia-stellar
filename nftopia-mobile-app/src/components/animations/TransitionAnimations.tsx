import React, { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  Easing,
  ViewStyle,
  StyleProp,
} from 'react-native';

interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  duration = 300,
  delay = 0,
  style,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: duration,
      delay: delay,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);

  return (
    <Animated.View style={[styles.fadeIn, { opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  duration?: number;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  direction = 'right',
  duration = 350,
  delay = 0,
  distance = 50,
  style,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: duration,
      delay: delay,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [slideAnim, duration, delay]);

  const getTransform = () => {
    const translate = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [distance, 0],
    });

    switch (direction) {
      case 'left':
        return [{ translateX: translate }];
      case 'right':
        return [{ translateX: Animated.multiply(translate, -1) }];
      case 'top':
        return [{ translateY: translate }];
      case 'bottom':
        return [{ translateY: Animated.multiply(translate, -1) }];
      default:
        return [{ translateX: translate }];
    }
  };

  return (
    <Animated.View
      style={[
        styles.slideIn,
        {
          opacity: slideAnim,
          transform: getTransform(),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface ScaleInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialScale?: number;
  style?: StyleProp<ViewStyle>;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  duration = 400,
  delay = 0,
  initialScale = 0.8,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      duration: duration,
      delay: delay,
      useNativeDriver: true,
      stiffness: 200,
      damping: 20,
    }).start();
  }, [scaleAnim, duration, delay]);

  const scale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [initialScale, 1],
  });

  return (
    <Animated.View
      style={[
        styles.scaleIn,
        {
          opacity: scaleAnim,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface StaggerProps {
  children: React.ReactNode[];
  duration?: number;
  staggerDelay?: number;
  style?: StyleProp<ViewStyle>;
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  duration = 300,
  staggerDelay = 50,
  style,
}) => {
  const animValues = useRef(children.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = animValues.map((anim, index) => {
      return Animated.timing(anim, {
        toValue: 1,
        duration: duration,
        delay: index * staggerDelay,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    });

    Animated.stagger(staggerDelay, animations).start();
  }, [animValues, duration, staggerDelay]);

  return (
    <View style={[styles.staggerContainer, style]}>
      {children.map((child, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: animValues[index],
            transform: [
              {
                translateY: animValues[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          {child}
        </Animated.View>
      ))}
    </View>
  );
};

interface PulseProps {
  children: React.ReactNode;
  duration?: number;
  scale?: number;
  style?: StyleProp<ViewStyle>;
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  duration = 1000,
  scale = 1.05,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: scale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseAnim, duration, scale]);

  return (
    <Animated.View
      style={[
        styles.pulse,
        {
          transform: [{ scale: pulseAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fadeIn: {
    flex: 1,
  },
  slideIn: {
    flex: 1,
  },
  scaleIn: {
    flex: 1,
  },
  staggerContainer: {
    flex: 1,
  },
  pulse: {
    flex: 1,
  },
});