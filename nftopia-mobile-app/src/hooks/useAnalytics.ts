import { useCallback, useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { analyticsService } from '@/src/analytics/analytics.service';
import { ANALYTICS_EVENTS, FUNNELS } from '@/src/analytics/config';

export function useAnalytics() {
  const track = useCallback((
    eventName: string,
    properties?: Record<string, any>
  ) => {
    analyticsService.track(eventName, properties);
  }, []);

  const trackFunnel = useCallback((
    funnelId: string,
    step: string,
    properties?: Record<string, any>
  ) => {
    analyticsService.trackFunnel(funnelId, step, properties);
  }, []);

  const trackError = useCallback((
    error: Error,
    context?: Record<string, any>
  ) => {
    analyticsService.trackError(error, context);
  }, []);

  const trackScreenView = useCallback((
    screenName: string,
    properties?: Record<string, any>
  ) => {
    analyticsService.trackScreenView(screenName, properties);
  }, []);

  const trackPerformance = useCallback((
    metric: string,
    value: number,
    properties?: Record<string, any>
  ) => {
    analyticsService.trackPerformance(metric, value, properties);
  }, []);

  const identify = useCallback((
    userId: string,
    properties?: Record<string, any>
  ) => {
    analyticsService.identify(userId, properties);
  }, []);

  const reset = useCallback(() => {
    analyticsService.reset();
  }, []);

  const setConsent = useCallback((given: boolean) => {
    analyticsService.setConsent(given);
  }, []);

  const hasConsent = useCallback(() => {
    return analyticsService.hasConsent();
  }, []);

  return {
    track,
    trackFunnel,
    trackError,
    trackScreenView,
    trackPerformance,
    identify,
    reset,
    setConsent,
    hasConsent,
  };
}

export function useScreenTracking(screenName: string) {
  const { trackScreenView } = useAnalytics();
  const route = useRoute();

  useEffect(() => {
    trackScreenView(screenName, {
      route: route.name,
      params: route.params,
    });
  }, [screenName, route, trackScreenView]);
}

export function useFunnelTracking(funnelId: keyof typeof FUNNELS) {
  const { trackFunnel } = useAnalytics();
  const funnel = FUNNELS[funnelId];
  const currentStep = useRef(0);

  const trackStep = useCallback((step: string, properties?: Record<string, any>) => {
    trackFunnel(funnel.id, step, properties);
  }, [funnel, trackFunnel]);

  const trackNextStep = useCallback((properties?: Record<string, any>) => {
    if (currentStep.current < funnel.steps.length) {
      const step = funnel.steps[currentStep.current];
      trackFunnel(funnel.id, step, properties);
      currentStep.current++;
    }
  }, [funnel, trackFunnel]);

  const trackComplete = useCallback((properties?: Record<string, any>) => {
    trackFunnel(funnel.id, 'complete', properties);
    currentStep.current = 0;
  }, [funnel, trackFunnel]);

  const trackAbandon = useCallback((properties?: Record<string, any>) => {
    trackFunnel(funnel.id, 'abandon', properties);
    currentStep.current = 0;
  }, [funnel, trackFunnel]);

  const resetFunnel = useCallback(() => {
    currentStep.current = 0;
  }, []);

  return {
    trackStep,
    trackNextStep,
    trackComplete,
    trackAbandon,
    resetFunnel,
    currentStep: currentStep.current,
    totalSteps: funnel.steps.length,
  };
}

export function usePerformanceTracking(componentName: string) {
  const { trackPerformance } = useAnalytics();
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();

    return () => {
      const duration = Date.now() - startTime.current;
      trackPerformance('component_render_time', duration, {
        component: componentName,
      });
    };
  }, [componentName, trackPerformance]);

  const trackInteraction = useCallback((
    interaction: string,
    duration: number,
    properties?: Record<string, any>
  ) => {
    trackPerformance('interaction_time', duration, {
      component: componentName,
      interaction,
      ...properties,
    });
  }, [componentName, trackPerformance]);

  const trackLoadTime = useCallback((
    loadTime: number,
    properties?: Record<string, any>
  ) => {
    trackPerformance('load_time', loadTime, {
      component: componentName,
      ...properties,
    });
  }, [componentName, trackPerformance]);

  return {
    trackInteraction,
    trackLoadTime,
  };
}

export function useNavigationTracking() {
  const navigation = useNavigation();
  const { track } = useAnalytics();

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (state) => {
      // Track navigation events
      const currentRoute = state.data?.state?.routes?.[state.data?.state?.index ?? 0];
      if (currentRoute) {
        track(ANALYTICS_EVENTS.NAVIGATE, {
          route: currentRoute.name,
          params: currentRoute.params,
        });
      }
    });

    return unsubscribe;
  }, [navigation, track]);

  return { navigation };
}