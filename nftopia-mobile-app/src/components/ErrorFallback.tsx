import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { AppError } from '@/src/errors/types';

interface ErrorFallbackProps {
  error: AppError | Error | null;
  onRetry?: () => void;
  onGoBack?: () => void;
  showRetry?: boolean;
  showGoBack?: boolean;
  customMessage?: string;
  customTitle?: string;
}

export function ErrorFallback({
  error,
  onRetry,
  onGoBack,
  showRetry = true,
  showGoBack = false,
  customMessage,
  customTitle,
}: ErrorFallbackProps) {
  const { t } = useTranslation();

  const getErrorMessage = () => {
    if (customMessage) return customMessage;
    if (error) {
      const appError = error as AppError;
      return appError.userMessage || appError.message || t('errors.generic');
    }
    return t('errors.generic');
  };

  const getErrorTitle = () => {
    if (customTitle) return customTitle;
    if (error) {
      const appError = error as AppError;
      if (appError.code === 'ERR_NETWORK') return 'Network Error';
      if (appError.code === 'ERR_UNAUTHORIZED') return 'Unauthorized';
      if (appError.code === 'ERR_NOT_FOUND') return 'Not Found';
      if (appError.code === 'ERR_SERVER') return 'Server Error';
    }
    return t('common.error');
  };

  const getErrorIcon = () => {
    if (!error) return '⚠️';
    const appError = error as AppError;
    switch (appError.code) {
      case 'ERR_NETWORK':
        return '📶';
      case 'ERR_UNAUTHORIZED':
        return '🔒';
      case 'ERR_NOT_FOUND':
        return '🔍';
      case 'ERR_SERVER':
        return '🖥️';
      default:
        return '⚠️';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{getErrorIcon()}</Text>
      <Text style={styles.title}>{getErrorTitle()}</Text>
      <Text style={styles.message}>{getErrorMessage()}</Text>
      <View style={styles.buttonContainer}>
        {showRetry && onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        )}
        {showGoBack && onGoBack && (
          <TouchableOpacity style={styles.goBackButton} onPress={onGoBack}>
            <Text style={styles.goBackText}>{t('common.back')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function LoadingErrorFallback({
  error,
  onRetry,
}: {
  error: AppError | Error | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⏳</Text>
      <Text style={styles.title}>Loading Error</Text>
      <Text style={styles.message}>
        {error ? error.message : 'Failed to load content.'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function NetworkErrorFallback({
  onRetry,
  onGoBack,
}: {
  onRetry: () => void;
  onGoBack?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📶</Text>
      <Text style={styles.title}>Network Error</Text>
      <Text style={styles.message}>
        {t('common.networkError')}
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
        {onGoBack && (
          <TouchableOpacity style={styles.goBackButton} onPress={onGoBack}>
            <Text style={styles.goBackText}>{t('common.back')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function EmptyStateFallback({
  icon = '📭',
  title = 'No Data',
  message = 'No data available to display.',
  actionLabel,
  onAction,
}: {
  icon?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  goBackButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  goBackText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyAction: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});