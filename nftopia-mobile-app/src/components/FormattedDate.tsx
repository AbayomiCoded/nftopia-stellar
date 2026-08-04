import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';

interface FormattedDateProps extends TextProps {
  date: Date | string;
  format?: 'short' | 'long' | 'time' | 'datetime' | 'relative';
  fallback?: string;
}

export function FormattedDate({
  date,
  format = 'long',
  fallback = '-',
  style,
  ...props
}: FormattedDateProps) {
  const { t, i18n } = useTranslation();

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return <Text style={style} {...props}>{fallback}</Text>;
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    let formattedDate: string;

    switch (format) {
      case 'short':
        options.month = '2-digit';
        options.day = '2-digit';
        options.year = 'numeric';
        formattedDate = new Intl.DateTimeFormat(i18n.language, options).format(dateObj);
        break;
      case 'time':
        return <Text style={style} {...props}>
          {new Intl.DateTimeFormat(i18n.language, {
            hour: '2-digit',
            minute: '2-digit',
          }).format(dateObj)}
        </Text>;
      case 'datetime':
        formattedDate = new Intl.DateTimeFormat(i18n.language, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(dateObj);
        break;
      case 'relative':
        return <Text style={style} {...props}>
          {formatRelativeTime(dateObj, i18n.language, t)}
        </Text>;
      case 'long':
      default:
        formattedDate = new Intl.DateTimeFormat(i18n.language, options).format(dateObj);
        break;
    }

    return <Text style={style} {...props}>{formattedDate}</Text>;
  } catch (error) {
    return <Text style={style} {...props}>{fallback}</Text>;
  }
}

function formatRelativeTime(date: Date, locale: string, t: any): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = [
    { label: 'time.year', seconds: 31536000, plural: 'time.years' },
    { label: 'time.month', seconds: 2592000, plural: 'time.months' },
    { label: 'time.week', seconds: 604800, plural: 'time.weeks' },
    { label: 'time.day', seconds: 86400, plural: 'time.days' },
    { label: 'time.hour', seconds: 3600, plural: 'time.hours' },
    { label: 'time.minute', seconds: 60, plural: 'time.minutes' },
    { label: 'time.now', seconds: 0, plural: 'time.now' },
  ];

  if (diffInSeconds < 5) {
    return t('time.now');
  }

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return interval.seconds > 60
        ? t(interval.plural, { count })
        : t(interval.label);
    }
  }

  return t('time.now');
}