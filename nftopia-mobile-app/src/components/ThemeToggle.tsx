import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/src/theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { colors } from '@/constants/theme';

interface ThemeToggleProps {
  variant?: 'button' | 'switch' | 'compact';
  showLabel?: boolean;
}

export function ThemeToggle({ variant = 'button', showLabel = true }: ThemeToggleProps) {
  const { isDark, mode, setTheme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const animationValue = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animationValue, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isDark, animationValue]);

  const getIcon = () => {
    if (mode === 'system') {
      return '🔄';
    }
    return isDark ? '🌙' : '☀️';
  };

  const getLabel = () => {
    if (mode === 'system') {
      return t('theme.system') || 'System';
    }
    return isDark ? t('theme.dark') || 'Dark' : t('theme.light') || 'Light';
  };

  const handlePress = () => {
    toggleTheme();
  };

  const handleLongPress = () => {
    // Cycle through modes: light -> dark -> system -> light
    const modes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setTheme(nextMode);
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactButton}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <Text style={styles.compactIcon}>{getIcon()}</Text>
        {showLabel && <Text style={styles.compactLabel}>{getLabel()}</Text>}
      </TouchableOpacity>
    );
  }

  if (variant === 'switch') {
    const translateX = animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 22],
    });

    return (
      <TouchableOpacity
        style={[styles.switchContainer, isDark ? styles.switchDark : styles.switchLight]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.switchThumb,
            {
              transform: [{ translateX }],
            },
          ]}
        />
        <View style={styles.switchIcons}>
          <Text style={styles.switchIcon}>☀️</Text>
          <Text style={styles.switchIcon}>🌙</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Default button variant
  return (
    <TouchableOpacity
      style={[styles.button, isDark ? styles.buttonDark : styles.buttonLight]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{getIcon()}</Text>
      {showLabel && (
        <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>
          {getLabel()}
        </Text>
      )}
      {mode === 'system' && (
        <View style={styles.systemBadge}>
          <Text style={styles.systemBadgeText}>Auto</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonLight: {
    backgroundColor: colors.background,
  },
  buttonDark: {
    backgroundColor: '#2d2d2d',
    borderColor: '#404040',
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelLight: {
    color: colors.text,
  },
  labelDark: {
    color: '#ffffff',
  },
  systemBadge: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  systemBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  switchContainer: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
    position: 'relative',
  },
  switchLight: {
    backgroundColor: '#e0e0e0',
  },
  switchDark: {
    backgroundColor: '#404040',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    position: 'absolute',
    zIndex: 2,
  },
  switchIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  switchIcon: {
    fontSize: 14,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactIcon: {
    fontSize: 16,
  },
  compactLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
});