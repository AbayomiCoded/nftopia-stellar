import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { Theme, ThemeMode, ThemeColors } from './types';
import { lightColors, darkColors } from './colors';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { analyticsService } from '@/src/analytics/analytics.service';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  systemTheme: 'light' | 'dark' | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { theme: storedTheme, setTheme: setStoredTheme } = usePreferencesStore();
  const [mode, setMode] = useState<ThemeMode>(storedTheme || 'system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark' | null>(systemColorScheme || null);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme || null);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Update mode when stored theme changes
  useEffect(() => {
    if (storedTheme) {
      setMode(storedTheme);
    }
  }, [storedTheme]);

  // Determine actual theme (light/dark based on mode and system)
  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemTheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemTheme]);

  // Get colors based on theme
  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  // Build full theme object
  const theme = useMemo<Theme>(() => ({
    mode,
    colors,
    spacing,
    borderRadius,
    shadows: {
      sm: {
        ...shadows.sm,
        shadowColor: colors.shadowColor,
      },
      md: {
        ...shadows.md,
        shadowColor: colors.shadowColor,
      },
    },
    typography: {
      h1: { ...typography.h1, color: colors.text },
      h2: { ...typography.h2, color: colors.text },
      h3: { ...typography.h3, color: colors.text },
      body: { ...typography.body, color: colors.text },
      bodySmall: { ...typography.bodySmall, color: colors.textSecondary },
      caption: { ...typography.caption, color: colors.textTertiary },
      mono: { ...typography.mono, color: colors.text },
    },
    isDark,
  }), [mode, colors, isDark, spacing, borderRadius, shadows, typography]);

  // Set theme with analytics tracking
  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    setStoredTheme(newMode);
    
    // Track theme change
    analyticsService.track('theme_changed', {
      mode: newMode,
      isDark: newMode === 'dark' || (newMode === 'system' && systemTheme === 'dark'),
    });
  }, [setStoredTheme, systemTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    if (mode === 'system') {
      // If in system mode, toggle to opposite of current system theme
      const currentActual = isDark ? 'light' : 'dark';
      setTheme(currentActual);
    } else {
      setTheme(mode === 'light' ? 'dark' : 'light');
    }
  }, [mode, isDark, setTheme]);

  const contextValue = useMemo<ThemeContextType>(() => ({
    theme,
    mode,
    colors,
    isDark,
    setTheme,
    toggleTheme,
    systemTheme,
  }), [theme, mode, colors, isDark, setTheme, toggleTheme, systemTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeColors = (): ThemeColors => {
  const { colors } = useTheme();
  return colors;
};

export const useIsDark = (): boolean => {
  const { isDark } = useTheme();
  return isDark;
};