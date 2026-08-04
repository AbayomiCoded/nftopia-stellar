import * as Linking from 'expo-linking';
import { analyticsService } from '@/src/analytics/analytics.service';
import { errorLogger } from '@/src/errors/logger';
import { validateDeepLink, parseDeepLinkParams, buildDeepLink } from '@/src/navigation/linking.config';

export interface DeepLinkData {
  url: string;
  path: string;
  params: Record<string, string>;
  screen: string;
  isAuthenticated: boolean;
}

export type DeepLinkHandler = (data: DeepLinkData) => void;

class DeepLinkService {
  private static instance: DeepLinkService;
  private handlers: DeepLinkHandler[] = [];
  private pendingDeepLink: string | null = null;
  private isAuthenticated = false;

  private constructor() {}

  static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  setAuthenticated(authenticated: boolean): void {
    this.isAuthenticated = authenticated;
    // If authenticated and there's a pending deep link, process it
    if (authenticated && this.pendingDeepLink) {
      this.processDeepLink(this.pendingDeepLink);
      this.pendingDeepLink = null;
    }
  }

  registerHandler(handler: DeepLinkHandler): void {
    this.handlers.push(handler);
  }

  unregisterHandler(handler: DeepLinkHandler): void {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  async processDeepLink(url: string): Promise<void> {
    try {
      // Validate the deep link
      if (!validateDeepLink(url)) {
        console.warn('[DeepLink] Invalid URL:', url);
        this.trackDeepLinkError(url, 'invalid_url');
        return;
      }

      // Parse the URL
      const parsed = new URL(url);
      const path = parsed.pathname;
      const params = parseDeepLinkParams(url);
      const screen = this.getScreenFromPath(path);

      // Track deep link open
      this.trackDeepLinkOpen(url, screen, params);

      const data: DeepLinkData = {
        url,
        path,
        params,
        screen,
        isAuthenticated: this.isAuthenticated,
      };

      // If authentication is required and user is not authenticated
      if (this.requiresAuthentication(screen) && !this.isAuthenticated) {
        // Store deep link for later processing
        this.pendingDeepLink = url;
        console.log('[DeepLink] Stored pending deep link:', url);
        // Navigate to auth flow
        this.navigateToAuth(data);
        return;
      }

      // Notify all handlers
      this.handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          errorLogger.log(error as Error, 'DeepLinkHandler', undefined, { url, screen });
        }
      });

      console.log('[DeepLink] Processed:', url);
    } catch (error) {
      errorLogger.log(error as Error, 'DeepLinkService', undefined, { url });
      this.trackDeepLinkError(url, 'processing_error');
    }
  }

  private getScreenFromPath(path: string): string {
    const pathMap: Record<string, string> = {
      '/': 'Home',
      '/nft': 'NFTDetail',
      '/collection': 'CollectionDetail',
      '/profile': 'Profile',
      '/marketplace': 'Marketplace',
      '/notifications': 'Notifications',
      '/auction': 'AuctionDetail',
      '/creator': 'CreatorProfile',
      '/wallet': 'WalletManagement',
      '/auth/login': 'EmailLogin',
      '/auth/register': 'EmailRegister',
      '/onboarding': 'Onboarding',
      '/wallet/select': 'WalletSelection',
      '/wallet/create': 'WalletCreate',
      '/wallet/import': 'WalletImport',
    };

    // Match the exact path or fallback to the base path
    let matchedPath = path;
    if (!pathMap[path]) {
      // Try to match by prefix
      const matchingPrefix = Object.keys(pathMap).find(prefix => path.startsWith(prefix));
      if (matchingPrefix) {
        matchedPath = matchingPrefix;
      }
    }

    return pathMap[matchedPath] || 'NotFound';
  }

  private requiresAuthentication(screen: string): boolean {
    const publicScreens = [
      'Onboarding',
      'EmailLogin',
      'EmailRegister',
      'WalletSelection',
      'WalletCreate',
      'WalletImport',
    ];
    return !publicScreens.includes(screen);
  }

  private navigateToAuth(data: DeepLinkData): void {
    // This will be handled by the navigation container
    // The pending deep link will be processed after authentication
    console.log('[DeepLink] Redirecting to auth for:', data.screen);
  }

  private trackDeepLinkOpen(url: string, screen: string, params: Record<string, string>): void {
    analyticsService.track('deep_link_open', {
      url,
      screen,
      params,
      isAuthenticated: this.isAuthenticated,
      timestamp: Date.now(),
    });
  }

  private trackDeepLinkError(url: string, errorType: string): void {
    analyticsService.track('deep_link_error', {
      url,
      errorType,
      isAuthenticated: this.isAuthenticated,
      timestamp: Date.now(),
    });
  }

  getPendingDeepLink(): string | null {
    return this.pendingDeepLink;
  }

  clearPendingDeepLink(): void {
    this.pendingDeepLink = null;
  }

  // Build a shareable deep link
  buildShareLink(
    path: string,
    params?: Record<string, string | number>,
    scheme?: string
  ): string {
    return buildDeepLink(path, params, scheme);
  }
}

export const deepLinkService = DeepLinkService.getInstance();