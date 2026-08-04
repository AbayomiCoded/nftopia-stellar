import { useEffect, useRef, useCallback } from 'react';
import { performanceService } from '@/src/services/performance.service';
import { useFocusEffect } from '@react-navigation/native';

export function usePerformanceTracking(screenName: string) {
  const isMounted = useRef(true);
  const hasTracked = useRef(false);

  // Track screen load on mount
  useEffect(() => {
    if (!hasTracked.current) {
      performanceService.startScreenLoad(screenName);
      hasTracked.current = true;
    }

    return () => {
      if (isMounted.current) {
        performanceService.endScreenLoad(screenName);
      }
    };
  }, [screenName]);

  // Track screen focus
  useFocusEffect(
    useCallback(() => {
      performanceService.startScreenLoad(`${screenName}_focus`);
      
      return () => {
        performanceService.endScreenLoad(`${screenName}_focus`);
      };
    }, [screenName])
  );

  const trackMetric = useCallback(
    (name: string, value: number, unit?: string, tags?: Record<string, any>) => {
      performanceService.trackMetric(`${screenName}_${name}`, value, unit, tags);
    },
    [screenName]
  );

  const trackAPI = useCallback(
    (endpoint: string, method: string, duration: number, status: number, size?: number) => {
      performanceService.trackAPIMetric({
        endpoint: `${screenName}_${endpoint}`,
        method,
        duration,
        status,
        size,
        timestamp: Date.now(),
      });
    },
    [screenName]
  );

  return {
    trackMetric,
    trackAPI,
    startAPICall: performanceService.startAPICall.bind(performanceService),
    endAPICall: performanceService.endAPICall.bind(performanceService),
  };
}