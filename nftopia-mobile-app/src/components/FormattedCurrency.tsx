import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';

interface FormattedCurrencyProps extends TextProps {
  amount: number | string;
  currency?: string;
  fallback?: string;
}

export function FormattedCurrency({
  amount,
  currency = 'USD',
  fallback = '0.00',
  style,
  ...props
}: FormattedCurrencyProps) {
  const { i18n } = useTranslation();

  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount)) {
      return <Text style={style} {...props}>{fallback}</Text>;
    }

    const formatted = new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);

    return <Text style={style} {...props}>{formatted}</Text>;
  } catch (error) {
    return <Text style={style} {...props}>{fallback}</Text>;
  }
}