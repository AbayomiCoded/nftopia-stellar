import React from 'react';
import { AppError } from '@/src/errors/types';

export function safeRender<T>(
  data: T | null | undefined,
  renderFn: (data: T) => React.ReactNode,
  fallback: React.ReactNode = null
): React.ReactNode {
  if (data === null || data === undefined) {
    return fallback;
  }
  return renderFn(data);
}

export function safeArray<T>(
  array: T[] | null | undefined,
  fallback: T[] = []
): T[] {
  return array || fallback;
}

export function safeString(
  str: string | null | undefined,
  fallback: string = ''
): string {
  return str || fallback;
}

export function safeNumber(
  num: number | null | undefined,
  fallback: number = 0
): number {
  return num || fallback;
}

export function safeObject<T>(
  obj: T | null | undefined,
  fallback: T = {} as T
): T {
  return obj || fallback;
}

export function safeBoolean(
  bool: boolean | null | undefined,
  fallback: boolean = false
): boolean {
  return bool !== null && bool !== undefined ? bool : fallback;
}

export function withSafeData<P extends { data?: any }>(
  WrappedComponent: React.ComponentType<P>,
  fallback: React.ReactNode = null
): React.ComponentType<P> {
  return function WithSafeData(props: P) {
    if (!props.data) {
      return fallback as React.ReactElement;
    }
    return <WrappedComponent {...props} />;
  };
}

export class SafeRender {
  static string(value: string | null | undefined, fallback: string = ''): string {
    return safeString(value, fallback);
  }

  static number(value: number | null | undefined, fallback: number = 0): number {
    return safeNumber(value, fallback);
  }

  static array<T>(value: T[] | null | undefined, fallback: T[] = []): T[] {
    return safeArray(value, fallback);
  }

  static object<T>(value: T | null | undefined, fallback: T = {} as T): T {
    return safeObject(value, fallback);
  }

  static boolean(value: boolean | null | undefined, fallback: boolean = false): boolean {
    return safeBoolean(value, fallback);
  }

  static render<T>(
    data: T | null | undefined,
    renderFn: (data: T) => React.ReactNode,
    fallback: React.ReactNode = null
  ): React.ReactNode {
    return safeRender(data, renderFn, fallback);
  }

  static optional<T>(
    value: T | null | undefined,
    defaultValue: T
  ): T {
    return value !== null && value !== undefined ? value : defaultValue;
  }
}