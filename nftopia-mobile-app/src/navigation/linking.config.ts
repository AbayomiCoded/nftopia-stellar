import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Home: undefined;
  NFTDetail: { nftId: string };
  CollectionDetail: { collectionId: string };
  Profile: { userId?: string };
  Marketplace: undefined;
  Notifications: undefined;
  AuctionDetail: { auctionId: string };
  CreatorProfile: { creatorId: string };
  WalletManagement: undefined;
  EmailLogin: undefined;
  EmailRegister: undefined;
  Onboarding: undefined;
  WalletSelection: undefined;
  WalletCreate: undefined;
  WalletImport: undefined;
};

export const DEEP_LINK_SCHEMES = {
  // Production schemes
  production: 'nftopia',
  // Development schemes
  development: 'nftopia-dev',
  // Staging schemes
  staging: 'nftopia-staging',
};

export const DEEP_LINK_PATHS = {
  home: '/',
  nft: '/nft/:nftId',
  collection: '/collection/:collectionId',
  profile: '/profile/:userId?',
  marketplace: '/marketplace',
  notifications: '/notifications',
  auction: '/auction/:auctionId',
  creator: '/creator/:creatorId',
  wallet: '/wallet',
  auth: '/auth',
  login: '/auth/login',
  register: '/auth/register',
  onboarding: '/onboarding',
};

export const getLinkingConfig = (): LinkingOptions<RootStackParamList> => {
  const prefix = Linking.createURL('/');
  const schemes = [
    DEEP_LINK_SCHEMES.production,
    DEEP_LINK_SCHEMES.development,
    DEEP_LINK_SCHEMES.staging,
  ];

  const prefixes = [
    ...schemes.map(scheme => `${scheme}://`),
    'https://nftopia.io',
    'https://www.nftopia.io',
    'https://app.nftopia.io',
    prefix,
  ];

  return {
    prefixes,
    config: {
      screens: {
        // Auth Stack
        Auth: {
          screens: {
            Onboarding: DEEP_LINK_PATHS.onboarding,
            EmailLogin: DEEP_LINK_PATHS.login,
            EmailRegister: DEEP_LINK_PATHS.register,
            WalletSelection: '/wallet/select',
            WalletCreate: '/wallet/create',
            WalletImport: '/wallet/import',
          },
        },
        // Main Stack
        Main: {
          screens: {
            Home: DEEP_LINK_PATHS.home,
            Marketplace: DEEP_LINK_PATHS.marketplace,
            Notifications: DEEP_LINK_PATHS.notifications,
            Profile: DEEP_LINK_PATHS.profile,
            NFTDetail: DEEP_LINK_PATHS.nft,
            CollectionDetail: DEEP_LINK_PATHS.collection,
            AuctionDetail: DEEP_LINK_PATHS.auction,
            CreatorProfile: DEEP_LINK_PATHS.creator,
            WalletManagement: DEEP_LINK_PATHS.wallet,
          },
        },
      },
    },
    // Custom function to get the initial URL
    getInitialURL: async () => {
      // Check if app was opened from a deep link
      const url = await Linking.getInitialURL();
      if (url != null) {
        return url;
      }
      return null;
    },
    // Custom function to subscribe to URL changes
    subscribe: (listener: (url: string) => void) => {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        listener(url);
      });
      return () => {
        subscription.remove();
      };
    },
  };
};

// Helper function to build deep link URLs
export const buildDeepLink = (
  path: string,
  params?: Record<string, string | number>,
  scheme: string = DEEP_LINK_SCHEMES.production
): string => {
  let url = `${scheme}://${path}`;
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    url += `?${queryParams.toString()}`;
  }
  return url;
};

// Helper function to parse deep link parameters
export const parseDeepLinkParams = (url: string): Record<string, string> => {
  const params: Record<string, string> = {};
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch (error) {
    console.error('[DeepLink] Failed to parse URL:', error);
  }
  return params;
};

// Deep link validation
export const validateDeepLink = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const validSchemes = [
      DEEP_LINK_SCHEMES.production,
      DEEP_LINK_SCHEMES.development,
      DEEP_LINK_SCHEMES.staging,
      'https',
      'http',
    ];
    return validSchemes.includes(parsed.protocol.replace(':', ''));
  } catch {
    return false;
  }
};