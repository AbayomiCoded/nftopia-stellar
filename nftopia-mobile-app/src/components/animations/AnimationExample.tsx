import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FadeIn, SlideIn, ScaleIn, Stagger, Pulse } from './TransitionAnimations';
import { LottieAnimation, LoadingAnimation, SuccessAnimation, ErrorAnimation } from './LottieAnimation';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

export const AnimationExample: React.FC = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const handleSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleError = () => {
    setShowError(true);
    setTimeout(() => setShowError(false), 2000);
  };

  const handleLoading = () => {
    setShowLoading(true);
    setTimeout(() => setShowLoading(false), 2000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Animations</Text>

      {/* Fade In */}
      <FadeIn>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fade In</Text>
        </View>
      </FadeIn>

      {/* Slide In */}
      <SlideIn direction="right" duration={500}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Slide In</Text>
        </View>
      </SlideIn>

      {/* Scale In */}
      <ScaleIn>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scale In</Text>
        </View>
      </ScaleIn>

      {/* Stagger */}
      <Stagger>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.card, { marginTop: spacing.sm }]}>
            <Text style={styles.cardTitle}>Stagger {i}</Text>
          </View>
        ))}
      </Stagger>

      {/* Pulse */}
      <Pulse>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pulse</Text>
        </View>
      </Pulse>

      {/* Buttons with animations */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleLoading}>
          <Text style={styles.buttonText}>Loading</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.successButton]} onPress={handleSuccess}>
          <Text style={styles.buttonText}>Success</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.errorButton]} onPress={handleError}>
          <Text style={styles.buttonText}>Error</Text>
        </TouchableOpacity>
      </View>

      {/* Animation Display */}
      {showLoading && (
        <View style={styles.animationContainer}>
          <LoadingAnimation size={80} />
          <Text style={styles.animationText}>Loading...</Text>
        </View>
      )}

      {showSuccess && (
        <View style={styles.animationContainer}>
          <SuccessAnimation size={120} />
          <Text style={styles.animationText}>Success!</Text>
        </View>
      )}

      {showError && (
        <View style={styles.animationContainer}>
          <ErrorAnimation size={120} />
          <Text style={styles.animationText}>Error!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 60,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  successButton: {
    backgroundColor: colors.success,
  },
  errorButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  animationContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  animationText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
});