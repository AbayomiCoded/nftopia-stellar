import React from 'react';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { ErrorBoundaryProps } from '@/src/errors/types';

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    name?: string;
    fallback?: React.ReactNode;
    onError?: (error: any, errorInfo: React.ErrorInfo) => void;
    onReset?: () => void;
    resetKeys?: any[];
  } = {}
): React.ComponentType<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary
        name={options.name || WrappedComponent.displayName || WrappedComponent.name}
        fallback={options.fallback}
        onError={options.onError}
        onReset={options.onReset}
        resetKeys={options.resetKeys}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export function withErrorBoundaryHOC<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  name?: string
): React.ComponentType<P> {
  return withErrorBoundary(WrappedComponent, { name });
}