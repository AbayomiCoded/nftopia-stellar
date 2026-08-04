import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface WebToAppBannerProps {
  visible: boolean;
  onClose?: () => void;
  url?: string;
  appName?: string;
}

export function WebToAppBanner({
  visible,
  onClose,
  url,
  appName = 'NFTopia',
}: WebToAppBannerProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(visible);
  const slideAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    setIsVisible(visible);
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [visible]);

  const handleOpenApp = () => {
    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to app store
        const appStoreUrl = Platform.select({
          ios: 'https://apps.apple.com/app/nftopia',
          android: 'https://play.google.com/store/apps/details?id=com.nftopia.app',
        });
        if (appStoreUrl) {
          Linking.openURL(appStoreUrl);
        }
      });
    }
    if (onClose) onClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📱</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Open in {appName}</Text>
          <Text style={styles.subtitle}>
            Get the best experience in the app
          </Text>
        </View>
        <TouchableOpacity style={styles.openButton} onPress={handleOpenApp}>
          <Text style={styles.openButtonText}>Open</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  openButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
});