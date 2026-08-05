export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight?: string;
  
  // Background colors
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHover?: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Border colors
  border: string;
  borderFocused: string;
  borderLight?: string;
  
  // Status colors
  error: string;
  errorBackground: string;
  errorText?: string;
  
  warning: string;
  warningBackground: string;
  warningText: string;
  
  success: string;
  successBackground?: string;
  successText?: string;
  
  info: string;
  infoBackground: string;
  infoText: string;
  
  // Network colors
  testnet: string;
  mainnet: string;
  
  // Shadow colors
  shadowColor: string;
  
  // Additional
  overlay: string;
  backdrop: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeBorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ThemeShadows {
  sm: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  md: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  lg?: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export interface ThemeTypography {
  h1: { fontSize: number; fontWeight: 'bold'; color: string };
  h2: { fontSize: number; fontWeight: 'bold'; color: string };
  h3: { fontSize: number; fontWeight: '600'; color: string };
  body: { fontSize: number; color: string };
  bodySmall: { fontSize: number; color: string };
  caption: { fontSize: number; color: string };
  mono: { fontSize: number; fontFamily: string; color: string };
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  typography: ThemeTypography;
  isDark: boolean;
}