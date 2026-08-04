import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useDeepLink } from '@/src/hooks/useDeepLink';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface ShareButtonProps {
  path: string;
  params?: Record<string, string | number>;
  title?: string;
  message?: string;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  onShare?: () => void;
}

export function ShareButton({
  path,
  params,
  title = 'Check this out on NFTopia!',
  message,
  buttonText = 'Share',
  variant = 'primary',
  size = 'medium',
  onShare,
}: ShareButtonProps) {
  const { buildShareLink } = useDeepLink();
  const { track } = useAnalytics();
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    try {
      setLoading(true);
      
      // Build the deep link
      const link = buildShareLink(path, params);
      const shareMessage = message || `Check out this NFT on NFTopia!\n\n${link}`;

      // Track share event
      track('share', {
        path,
        params,
        link,
      });

      // Share using native share dialog
      const result = await Share.share({
        message: shareMessage,
        title: title,
      });

      if (result.action === Share.sharedAction) {
        track('share_success', {
          path,
          params,
        });
        if (onShare) onShare();
      } else if (result.action === Share.dismissedAction) {
        track('share_dismissed', {
          path,
          params,
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      track('share_error', {
        path,
        params,
        error: (error as Error).message,
      });
      Alert.alert('Error', 'Failed to share. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = () => {
    const baseStyle = [styles.button];
    
    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primary);
        break;
      case 'secondary':
        baseStyle.push(styles.secondary);
        break;
      case 'outline':
        baseStyle.push(styles.outline);
        break;
    }

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.small);
        break;
      case 'large':
        baseStyle.push(styles.large);
        break;
      default:
        baseStyle.push(styles.medium);
    }

    return baseStyle;
  };

  const getTextStyles = () => {
    const baseStyle = [styles.buttonText];
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primaryText);
        break;
      case 'secondary':
        baseStyle.push(styles.secondaryText);
        break;
      case 'outline':
        baseStyle.push(styles.outlineText);
        break;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={handleShare}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? '#FFFFFF' : colors.primary} 
        />
      ) : (
        <Text style={getTextStyles()}>
          {buttonText}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 60,
  },
  medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 80,
  },
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: 100,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: colors.text,
  },
  outlineText: {
    color: colors.primary,
  },
});