import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';

interface FormattedNumberProps extends TextProps {
  value: number | string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallback?: string;
}

export function FormattedNumber({
  value,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
  fallback = '0',
  style,
  ...props
}: FormattedNumberProps) {
  const { i18n } = useTranslation();

  try {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return <Text style={style} {...props}>{fallback}</Text>;
    }

    const formatted = new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(numValue);

    return <Text style={style} {...props}>{formatted}</Text>;
  } catch (error) {
    return <Text style={style} {...props}>{fallback}</Text>;
  }
}