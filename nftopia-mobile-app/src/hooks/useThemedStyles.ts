import { useMemo } from 'react';
import { useTheme } from '@/src/theme/ThemeContext';
import { Theme } from '@/src/theme/types';

export function useThemedStyles<T extends Record<string, any>>(
  stylesFn: (theme: Theme) => T
): T {
  const theme = useTheme();
  
  return useMemo(() => {
    return stylesFn(theme.theme);
  }, [theme.theme, stylesFn]);
}