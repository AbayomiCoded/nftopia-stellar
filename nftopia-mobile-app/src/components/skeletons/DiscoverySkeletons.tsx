import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonRect, SkeletonText } from './SkeletonShapes';
import { spacing as themeSpacing, borderRadius as themeBorderRadius } from '@/constants/theme';

export interface DiscoverySkeletonProps {
  animated?: boolean;
}

const CAROUSEL_CARD_WIDTH = 160;
const DROPS_CARD_WIDTH = 140;

export const TrendingCarouselSkeleton: React.FC<DiscoverySkeletonProps> = ({
  animated = true,
}) => {
  return (
    <View style={styles.row}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={[styles.card, { width: CAROUSEL_CARD_WIDTH }]}>
          <SkeletonRect
            width="100%"
            height={120}
            borderRadius={themeBorderRadius.lg}
            animated={animated}
          />
          <View style={styles.cardContent}>
            <SkeletonText width="80%" height={14} animated={animated} />
            <SkeletonText width="50%" height={12} animated={animated} spacing={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const NewDropsSkeleton: React.FC<DiscoverySkeletonProps> = ({
  animated = true,
}) => {
  return (
    <View style={styles.row}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={[styles.card, { width: DROPS_CARD_WIDTH }]}>
          <SkeletonRect
            width="100%"
            height={140}
            borderRadius={themeBorderRadius.lg}
            animated={animated}
          />
          <View style={styles.cardContent}>
            <SkeletonText width="70%" height={13} animated={animated} />
            <SkeletonText width="40%" height={12} animated={animated} spacing={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: themeSpacing.md,
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    paddingTop: themeSpacing.sm,
    gap: 4,
  },
});
