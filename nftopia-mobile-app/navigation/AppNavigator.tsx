import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import SplashScreen from '@/components/SplashScreen';
import { getLinkingConfig, RootStackParamList } from '@/src/navigation/linking.config';
import { deepLinkService } from '@/src/services/deepLink.service';
import { analyticsService } from '@/src/analytics/analytics.service';
import { errorLogger } from '@/src/errors/logger';

export default function AppNavigator() {
  const { isAuthenticated, isCheckingAuth, initializeAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | undefined>(undefined);

  // Initialize auth state on mount
  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      // Update deep link service with auth status
      deepLinkService.setAuthenticated(isAuthenticated);
      setIsReady(true);
    };
    init();
  }, []);

  // Track navigation state changes
  const onStateChange = (state: any) => {
    if (state) {
      const route = state.routes[state.index];
      analyticsService.track('navigation_state_change', {
        route: route.name,
        params: route.params,
      });
    }
  };

  // Handle deep link
  const onDeepLink = async (url: string) => {
    try {
      console.log('[DeepLink] Received:', url);
      await deepLinkService.processDeepLink(url);
    } catch (error) {
      errorLogger.log(error as Error, 'AppNavigator', undefined, { url });
      analyticsService.track('deep_link_processing_error', { url });
    }
  };

  // Get linking config
  const linking = getLinkingConfig();

  // Show splash screen while checking auth status
  if (isCheckingAuth || !isReady) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      linking={linking}
      onStateChange={onStateChange}
      onDeepLink={onDeepLink}
      fallback={<SplashScreen />}
    >
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}