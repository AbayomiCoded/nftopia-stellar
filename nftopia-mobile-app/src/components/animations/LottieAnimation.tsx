import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

interface LottieAnimationProps {
  source: any;
  loop?: boolean;
  autoPlay?: boolean;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  size?: number;
  onFinish?: () => void;
}

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  source,
  loop = true,
  autoPlay = true,
  speed = 1,
  style,
  size = 100,
  onFinish,
}) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (autoPlay) {
      animationRef.current?.play();
    }
  }, [autoPlay]);

  const handleFinish = () => {
    if (onFinish) {
      onFinish();
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <LottieView
        ref={animationRef}
        source={source}
        loop={loop}
        speed={speed}
        style={styles.animation}
        onAnimationFinish={handleFinish}
      />
    </View>
  );
};

export const LoadingAnimation: React.FC<{ size?: number }> = ({ size = 80 }) => {
  // In production, you would use actual Lottie JSON files
  // This is a placeholder - you'd import actual animation files
  const loadingSource = require('../../../assets/animations/loading.json');
  return (
    <LottieAnimation
      source={loadingSource}
      loop={true}
      size={size}
    />
  );
};

export const SuccessAnimation: React.FC<{ size?: number; onFinish?: () => void }> = ({
  size = 120,
  onFinish,
}) => {
  const successSource = require('../../../assets/animations/success.json');
  return (
    <LottieAnimation
      source={successSource}
      loop={false}
      size={size}
      onFinish={onFinish}
    />
  );
};

export const ErrorAnimation: React.FC<{ size?: number; onFinish?: () => void }> = ({
  size = 120,
  onFinish,
}) => {
  const errorSource = require('../../../assets/animations/error.json');
  return (
    <LottieAnimation
      source={errorSource}
      loop={false}
      size={size}
      onFinish={onFinish}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});