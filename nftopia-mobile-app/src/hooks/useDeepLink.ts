import { useEffect, useCallback, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { deepLinkService, DeepLinkData } from '@/src/services/deepLink.service';
import { analyticsService } from '@/src/analytics/analytics.service';
import { errorLogger } from '@/src/errors/logger';

export function useDeepLink() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFirstRender = useRef(true);

  const handleDeepLink = useCallback((data: DeepLinkData) => {
    try {
      // Navigate based on the screen from the deep link
      switch (data.screen) {
        case 'NFTDetail':
          if (data.params.nftId) {
            navigation.navigate('NFTDetail', { nftId: data.params.nftId });
          }
          break;

        case 'CollectionDetail':
          if (data.params.collectionId) {
            navigation.navigate('CollectionDetail', { collectionId: data.params.collectionId });
          }
          break;

        case 'Profile':
          navigation.navigate('Profile', { userId: data.params.userId });
          break;

        case 'Marketplace':
          navigation.navigate('Marketplace');
          break;

        case 'Notifications':
          navigation.navigate('Notifications');
          break;

        case 'AuctionDetail':
          if (data.params.auctionId) {
            navigation.navigate('AuctionDetail', { auctionId: data.params.auctionId });
          }
          break;

        case 'CreatorProfile':
          if (data.params.creatorId) {
            navigation.navigate('CreatorProfile', { creatorId: data.params.creatorId });
          }
          break;

        case 'WalletManagement':
          navigation.navigate('WalletManagement');
          break;

        case 'EmailLogin':
          navigation.navigate('EmailLogin');
          break;

        case 'EmailRegister':
          navigation.navigate('EmailRegister');
          break;

        case 'Onboarding':
          navigation.navigate('Onboarding');
          break;

        case 'WalletSelection':
          navigation.navigate('WalletSelection');
          break;

        case 'WalletCreate':
          navigation.navigate('WalletCreate');
          break;

        case 'WalletImport':
          navigation.navigate('WalletImport');
          break;

        case 'Home':
        default:
          navigation.navigate('Home');
          break;
      }

      console.log('[DeepLink] Navigated to:', data.screen);
    } catch (error) {
      errorLogger.log(error as Error, 'useDeepLink', undefined, { data });
      analyticsService.track('deep_link_navigation_error', {
        screen: data.screen,
        error: (error as Error).message,
      });
    }
  }, [navigation]);

  // Register deep link handler
  useEffect(() => {
    deepLinkService.registerHandler(handleDeepLink);

    // Check for pending deep link on mount
    const pendingLink = deepLinkService.getPendingDeepLink();
    if (pendingLink) {
      // Process the pending deep link after a small delay to ensure navigation is ready
      const timeout = setTimeout(() => {
        deepLinkService.processDeepLink(pendingLink);
        deepLinkService.clearPendingDeepLink();
      }, 500);

      return () => clearTimeout(timeout);
    }

    return () => {
      deepLinkService.unregisterHandler(handleDeepLink);
    };
  }, [handleDeepLink]);

  const processDeepLink = useCallback((url: string) => {
    return deepLinkService.processDeepLink(url);
  }, []);

  const buildShareLink = useCallback((
    path: string,
    params?: Record<string, string | number>,
    scheme?: string
  ) => {
    return deepLinkService.buildShareLink(path, params, scheme);
  }, []);

  const getPendingDeepLink = useCallback(() => {
    return deepLinkService.getPendingDeepLink();
  }, []);

  return {
    processDeepLink,
    buildShareLink,
    getPendingDeepLink,
    clearPendingDeepLink: deepLinkService.clearPendingDeepLink.bind(deepLinkService),
  };
}