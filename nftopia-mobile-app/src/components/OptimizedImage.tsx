import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  ViewStyle,
  ImageStyle,
  DimensionValue,
} from 'react-native';
import { Image as ExpoImage, ImageProps as ExpoImageProps } from 'expo-image';
import { useNetworkQuality } from '@/src/hooks/useNetworkQuality';
import { useImageCacheStore } from '@/src/stores/imageCacheStore';
import { getImageUrl, IMAGE_SIZES, ImageSize, DEFAULT_IMAGE_CONFIG } from '@/src/config/image.config';

interface OptimizedImageProps {
  source: string;
  size?: ImageSize;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  fallbackSource?: string;
  blurRadius?: number;
  cacheKey?: string;
  lazyLoad?: boolean;
  lazyLoadThreshold?: number;
  showSkeleton?: boolean;
  skeletonColor?: string;
  skeletonDuration?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  maxRetries?: number;
  retryDelay?: number;
  testID?: string;
}

interface ImageState {
  isLoading: boolean;
  hasError: boolean;
  retryCount: number;
  isVisible: boolean;
  progress: number;
}

export function OptimizedImage({
  source,
  size = 'medium',
  width,
  height,
  style,
  containerStyle,
  resizeMode = 'cover',
  fallbackSource,
  blurRadius = 0,
  cacheKey,
  lazyLoad = true,
  lazyLoadThreshold = DEFAULT_IMAGE_CONFIG.lazyLoadThreshold,
  showSkeleton = true,
  skeletonColor = '#E0E0E0',
  skeletonDuration = 800,
  onLoad,
  onError,
  onRetry,
  quality = 'auto',
  maxRetries = DEFAULT_IMAGE_CONFIG.maxRetries,
  retryDelay = DEFAULT_IMAGE_CONFIG.retryDelay,
  testID,
}: OptimizedImageProps) {
  const networkQuality = useNetworkQuality();
  const { addToCache, getFromCache, isCached } = useImageCacheStore();
  const [state, setState] = useState<ImageState>({
    isLoading: true,
    hasError: false,
    retryCount: 0,
    isVisible: false,
    progress: 0,
  });
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null
  );
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const animationValue = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);

  // Determine quality based on network
  const getEffectiveQuality = useCallback(() => {
    if (quality !== 'auto') return quality;
    switch (networkQuality) {
      case 'fast':
        return 'high';
      case 'medium':
        return 'medium';
      case 'slow':
      case 'unknown':
      default:
        return 'low';
    }
  }, [quality, networkQuality]);

  // Get optimized URL
  const getOptimizedUrl = useCallback(() => {
    const effectiveQuality = getEffectiveQuality();
    const format = effectiveQuality === 'high' ? 'webp' : 'jpeg';
    return getImageUrl(source, size, format);
  }, [source, size, getEffectiveQuality]);

  // Check cache
  const checkCache = useCallback(() => {
    const cacheKeyToUse = cacheKey || source;
    return isCached(cacheKeyToUse);
  }, [source, cacheKey, isCached]);

  // Handle load
  const handleLoad = useCallback(
    (event: any) => {
      if (!mounted.current) return;

      const { width: imgWidth, height: imgHeight } = event.source || event;
      setImageDimensions({ width: imgWidth, height: imgHeight });

      // Cache the image
      const cacheKeyToUse = cacheKey || source;
      const estimatedSize = (imgWidth * imgHeight * 4) / 1024; // Rough size in KB
      addToCache(cacheKeyToUse, estimatedSize, 'webp');

      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasError: false,
        progress: 1,
      }));

      // Animate in
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (onLoad) onLoad();
    },
    [source, cacheKey, addToCache, animationValue, onLoad]
  );

  // Handle error with retry
  const handleError = useCallback(
    (error: any) => {
      if (!mounted.current) return;

      if (state.retryCount < maxRetries) {
        // Retry with exponential backoff
        const delay = retryDelay * Math.pow(2, state.retryCount);
        if (onRetry) onRetry(state.retryCount + 1);

        setTimeout(() => {
          if (mounted.current) {
            setState((prev) => ({
              ...prev,
              retryCount: prev.retryCount + 1,
            }));
            // Force re-render to retry
            setState((prev) => ({ ...prev }));
          }
        }, delay);
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          hasError: true,
        }));
        if (onError) onError(error instanceof Error ? error : new Error('Failed to load image'));
      }
    },
    [state.retryCount, maxRetries, retryDelay, onRetry, onError]
  );

  // Handle visibility for lazy loading
  const handleLayout = useCallback(
    (event: any) => {
      const { width: layoutWidth } = event.nativeEvent.layout;
      setContainerWidth(layoutWidth);

      // Check if visible for lazy loading
      if (lazyLoad) {
        const y = event.nativeEvent.layout.y;
        const screenHeight = Dimensions.get('window').height;
        const isVisible = y < screenHeight + lazyLoadThreshold;
        if (isVisible) {
          setState((prev) => ({ ...prev, isVisible: true }));
        }
      } else {
        setState((prev) => ({ ...prev, isVisible: true }));
      }
    },
    [lazyLoad, lazyLoadThreshold]
  );

  // Start skeleton animation
  useEffect(() => {
    if (showSkeleton && state.isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animationValue, {
            toValue: 1,
            duration: skeletonDuration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(animationValue, {
            toValue: 0,
            duration: skeletonDuration / 2,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      animationValue.stopAnimation();
    }

    return () => {
      mounted.current = false;
      animationValue.stopAnimation();
    };
  }, [showSkeleton, state.isLoading, skeletonDuration, animationValue]);

  // Determine image source
  const imageSource = state.hasError && fallbackSource ? fallbackSource : getOptimizedUrl();

  // Determine dimensions
  const finalWidth = width || (size && IMAGE_SIZES[size]?.width) || '100%';
  const finalHeight =
    height ||
    (size && IMAGE_SIZES[size]?.height) ||
    (containerWidth ? containerWidth * 0.75 : 200);

  // Skeleton animation interpolations
  const skeletonOpacity = animationValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  // If not visible and lazy loading, show skeleton
  if (lazyLoad && !state.isVisible) {
    return (
      <View
        style={[styles.container, containerStyle]}
        onLayout={handleLayout}
        testID={testID}
      >
        {showSkeleton && (
          <Animated.View
            style={[
              styles.skeleton,
              {
                width: finalWidth,
                height: finalHeight,
                opacity: skeletonOpacity,
                backgroundColor: skeletonColor,
              },
            ]}
          />
        )}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, containerStyle]}
      onLayout={handleLayout}
      testID={testID}
    >
      {state.isLoading && showSkeleton && (
        <Animated.View
          style={[
            styles.skeleton,
            {
              width: finalWidth,
              height: finalHeight,
              opacity: skeletonOpacity,
              backgroundColor: skeletonColor,
              position: 'absolute',
              zIndex: 1,
            },
          ]}
        />
      )}

      {state.hasError && !fallbackSource ? (
        <View style={[styles.errorContainer, { width: finalWidth, height: finalHeight }]}>
          <Text style={styles.errorIcon}>🖼️</Text>
          <Text style={styles.errorText}>Failed to load</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setState((prev) => ({
                ...prev,
                hasError: false,
                isLoading: true,
                retryCount: 0,
              }));
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ExpoImage
          source={{ uri: imageSource }}
          style={[
            {
              width: finalWidth,
              height: finalHeight,
              opacity: state.isLoading ? 0 : 1,
            },
            style,
          ]}
          resizeMode={resizeMode as any}
          blurRadius={blurRadius > 0 ? blurRadius : undefined}
          onLoad={handleLoad}
          onError={handleError}
          cachePolicy="memory-disk"
          recyclingKey={cacheKey || source}
          contentFit={resizeMode as any}
          transition={200}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  skeleton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  errorContainer: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});