import { useState, useCallback } from 'react';
import { errorLogger } from '@/src/errors/logger';
import { AppError, ErrorSeverity } from '@/src/errors/types';

interface ErrorHandlerOptions {
  componentName?: string;
  userId?: string;
  severity?: ErrorSeverity;
  recoverable?: boolean;
  onError?: (error: AppError) => void;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const [error, setError] = useState<AppError | null>(null);
  const [isError, setIsError] = useState(false);

  const handleError = useCallback(
    (err: Error | AppError, context?: Record<string, any>) => {
      const appError: AppError = {
        ...err,
        code: (err as AppError).code || 'ERR_UNKNOWN',
        severity: options.severity || (err as AppError).severity || 'medium',
        userMessage: (err as AppError).userMessage || err.message,
        recoverable: options.recoverable !== undefined ? options.recoverable : true,
        timestamp: Date.now(),
        context: { ...(err as AppError).context, ...context },
      };

      setError(appError);
      setIsError(true);

      errorLogger.log(
        appError,
        options.componentName || 'useErrorHandler',
        options.userId,
        context
      );

      if (options.onError) {
        options.onError(appError);
      }

      return appError;
    },
    [options]
  );

  const clearError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  const resetError = useCallback(() => {
    clearError();
  }, [clearError]);

  return {
    error,
    isError,
    handleError,
    clearError,
    resetError,
    hasError: isError,
    setError,
  };
}