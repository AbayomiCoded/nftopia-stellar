export interface ImageConfig {
  quality: 'low' | 'medium' | 'high' | 'auto';
  format: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  cache: 'memory' | 'disk' | 'none';
  maxRetries: number;
  retryDelay: number;
  lazyLoadThreshold: number;
}

export const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  quality: 'auto',
  format: 'auto',
  cache: 'disk',
  maxRetries: 3,
  retryDelay: 1000,
  lazyLoadThreshold: 100,
};

export const IMAGE_SIZES = {
  thumbnail: { width: 100, height: 100 },
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 },
  full: { width: 1200, height: 1200 },
};

export type ImageSize = keyof typeof IMAGE_SIZES;

export const getImageUrl = (
  baseUrl: string,
  size: ImageSize = 'medium',
  format: 'webp' | 'jpeg' | 'png' = 'webp'
): string => {
  const { width, height } = IMAGE_SIZES[size];
  // Add query params for CDN optimization
  return `${baseUrl}?w=${width}&h=${height}&fmt=${format}&fit=cover`;
};