import React, { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { OptimizedImage } from '@/src/components/OptimizedImage';
import { TrendingCarouselSkeleton } from '@/src/components/skeletons';
import type { TrendingCollectionCard } from '@/src/utils/discoveryViewModels';
import { resolveSectionState } from '@/src/utils/discoveryViewModels';

const CARD_WIDTH = 160;
const CARD_IMAGE_HEIGHT = 120;

export interface TrendingCarouselProps {
  data: TrendingCollectionCard[];
  loading: boolean;
  error?: boolean;
  onItemPress: (item: TrendingCollectionCard) => void;
  onImpression?: (items: TrendingCollectionCard[]) => void;
  testID?: string;
}

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
  data,
  loading,
  error = false,
  onItemPress,
  onImpression,
  testID,
}) => {
  const { t } = useTranslation();
  const hasFiredImpression = useRef(false);

  useEffect(() => {
    if (!hasFiredImpression.current && data.length > 0) {
      hasFiredImpression.current = true;
      onImpression?.(data);
    }
  }, [data, onImpression]);

  const state = resolveSectionState({ loading, error, itemCount: data.length });

  if (state === 'loading') {
    return <TrendingCarouselSkeleton />;
  }

  if (state === 'error') {
    return (
      <View style={styles.emptyContainer} testID={testID ? `${testID}-error` : undefined}>
        <Text style={styles.emptyText}>{t('home.discovery.trending.error')}</Text>
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={styles.emptyContainer} testID={testID ? `${testID}-empty` : undefined}>
        <Text style={styles.emptyText}>{t('home.discovery.trending.empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      testID={testID}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => onItemPress(item)}
          accessibilityRole="button"
          accessibilityLabel={item.name}
        >
          <OptimizedImage
            source={item.imageUrl}
            width="100%"
            height={CARD_IMAGE_HEIGHT}
            resizeMode="cover"
            cacheKey={`trending-collection-${item.id}`}
            showSkeleton
            lazyLoad
            quality="auto"
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {t('home.discovery.trending.floorPrice', { amount: item.floorPriceLabel })}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

export default TrendingCarousel;

const styles = StyleSheet.create({
  listContent: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardContent: {
    padding: spacing.sm,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
