export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AppError extends Error {
  code?: string;
  severity?: ErrorSeverity;
  context?: Record<string, any>;
  timestamp?: number;
  userMessage?: string;
  recoverable?: boolean;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: AppError, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: any[];
  name?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  errorInfo: React.ErrorInfo | null;
}

export const ERROR_CODES = {
  NETWORK: 'ERR_NETWORK',
  TIMEOUT: 'ERR_TIMEOUT',
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  FORBIDDEN: 'ERR_FORBIDDEN',
  NOT_FOUND: 'ERR_NOT_FOUND',
  SERVER: 'ERR_SERVER',
  VALIDATION: 'ERR_VALIDATION',
  WALLET_CONNECTION: 'ERR_WALLET_CONNECTION',
  TRANSACTION_FAILED: 'ERR_TRANSACTION_FAILED',
  INSUFFICIENT_BALANCE: 'ERR_INSUFFICIENT_BALANCE',
  PARSE_ERROR: 'ERR_PARSE_ERROR',
  RENDER_ERROR: 'ERR_RENDER_ERROR',
  UNKNOWN: 'ERR_UNKNOWN',
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK]: 'Network error. Please check your connection.',
  [ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_CODES.UNAUTHORIZED]: 'Please sign in to continue.',
  [ERROR_CODES.FORBIDDEN]: 'You don\'t have permission to access this.',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found.',
  [ERROR_CODES.SERVER]: 'Server error. Please try again later.',
  [ERROR_CODES.VALIDATION]: 'Please check your input and try again.',
  [ERROR_CODES.WALLET_CONNECTION]: 'Failed to connect wallet. Please try again.',
  [ERROR_CODES.TRANSACTION_FAILED]: 'Transaction failed. Please try again.',
  [ERROR_CODES.INSUFFICIENT_BALANCE]: 'Insufficient balance for this transaction.',
  [ERROR_CODES.PARSE_ERROR]: 'Failed to parse data. Please try again.',
  [ERROR_CODES.RENDER_ERROR]: 'Something went wrong displaying this content.',
  [ERROR_CODES.UNKNOWN]: 'Something went wrong. Please try again.',
};

export const ERROR_SEVERITY: Record<string, ErrorSeverity> = {
  [ERROR_CODES.NETWORK]: 'medium',
  [ERROR_CODES.TIMEOUT]: 'medium',
  [ERROR_CODES.UNAUTHORIZED]: 'high',
  [ERROR_CODES.FORBIDDEN]: 'high',
  [ERROR_CODES.NOT_FOUND]: 'low',
  [ERROR_CODES.SERVER]: 'critical',
  [ERROR_CODES.VALIDATION]: 'low',
  [ERROR_CODES.WALLET_CONNECTION]: 'high',
  [ERROR_CODES.TRANSACTION_FAILED]: 'critical',
  [ERROR_CODES.INSUFFICIENT_BALANCE]: 'high',
  [ERROR_CODES.PARSE_ERROR]: 'medium',
  [ERROR_CODES.RENDER_ERROR]: 'critical',
  [ERROR_CODES.UNKNOWN]: 'medium',
};