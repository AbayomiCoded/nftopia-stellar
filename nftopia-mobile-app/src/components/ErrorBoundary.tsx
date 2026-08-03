import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { errorLogger } from '@/src/errors/logger';
import { AppError, ErrorBoundaryProps, ErrorBoundaryState, ERROR_CODES } from '@/src/errors/types';

// Default fallback component
function DefaultFallback({
  error,
  resetError,
  componentName,
}: {
  error: AppError | null;
  resetError: () => void;
  componentName?: string;
}) {
  const { t } = useTranslation();

  const getErrorMessage = () => {
    if (!error) return t('errors.generic');
    return error.userMessage || error.message || t('errors.generic');
  };

  const getErrorIcon = () => {
    if (!error) return '⚠️';
    switch (error.code) {
      case ERROR_CODES.NETWORK:
        return '📶';
      case ERROR_CODES.UNAUTHORIZED:
        return '🔒';
      case ERROR_CODES.NOT_FOUND:
        return '🔍';
      case ERROR_CODES.SERVER:
        return '🖥️';
      case ERROR_CODES.TRANSACTION_FAILED:
        return '💸';
      default:
        return '⚠️';
    }
  };

  const getErrorTitle = () => {
    if (!error) return t('common.error');
    switch (error.code) {
      case ERROR_CODES.NETWORK:
        return 'Network Error';
      case ERROR_CODES.UNAUTHORIZED:
        return 'Unauthorized';
      case ERROR_CODES.NOT_FOUND:
        return 'Not Found';
      case ERROR_CODES.SERVER:
        return 'Server Error';
      case ERROR_CODES.TRANSACTION_FAILED:
        return 'Transaction Failed';
      default:
        return t('common.error');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getErrorIcon()}</Text>
      </View>
      <Text style={styles.title}>{getErrorTitle()}</Text>
      <Text style={styles.message}>{getErrorMessage()}</Text>
      {__DEV__ && error && (
        <ScrollView style={styles.devContainer}>
          <Text style={styles.devLabel}>Error Details:</Text>
          <Text style={styles.devText}>Code: {error.code}</Text>
          <Text style={styles.devText}>Message: {error.message}</Text>
          {error.stack && (
            <Text style={[styles.devText, styles.devStack]}>{error.stack}</Text>
          )}
          {error.context && (
            <Text style={styles.devText}>
              Context: {JSON.stringify(error.context, null, 2)}
            </Text>
          )}
        </ScrollView>
      )}
      <TouchableOpacity style={styles.retryButton} onPress={resetError}>
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </TouchableOpacity>
      {componentName && (
        <Text style={styles.componentName}>
          Component: {componentName}
        </Text>
      )}
    </View>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const appError: AppError = {
      ...error,
      code: (error as AppError).code || ERROR_CODES.RENDER_ERROR,
      severity: (error as AppError).severity || 'critical',
      userMessage: (error as AppError).userMessage || error.message || 'Something went wrong displaying this content.',
      recoverable: true,
      timestamp: Date.now(),
    };
    return {
      hasError: true,
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const appError: AppError = {
      ...error,
      code: (error as AppError).code || ERROR_CODES.RENDER_ERROR,
      severity: 'critical',
      userMessage: error.message || 'Something went wrong displaying this content.',
      recoverable: true,
      timestamp: Date.now(),
      context: {
        componentStack: errorInfo.componentStack,
        componentName: this.props.name,
      },
    };

    this.setState({
      error: appError,
      errorInfo,
    });

    // Log error
    errorLogger.log(
      appError,
      this.props.name || 'UnknownComponent',
      undefined,
      { componentStack: errorInfo.componentStack }
    );

    // Call onError prop
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    if (this.state.hasError && resetKeys) {
      const hasChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasChanged) {
        this.resetError();
      }
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, name } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <DefaultFallback
          error={error}
          resetError={this.resetError}
          componentName={name}
        />
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 40,
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
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 120,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  componentName: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  devContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    maxHeight: 200,
    width: '100%',
  },
  devLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  devText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  devStack: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: spacing.xs,
  },
});