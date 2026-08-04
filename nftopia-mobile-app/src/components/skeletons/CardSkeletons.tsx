import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonRect, SkeletonText, SkeletonCircle } from './SkeletonShapes';
import { spacing as themeSpacing, borderRadius as themeBorderRadius } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

export interface NFTCardSkeletonProps {
  variant?: 'default' | 'grid';
  animated?: boolean;
}

export const NFTCardSkeleton: React.FC<NFTCardSkeletonProps> = ({
  variant = 'default',
  animated = true,
}) => {
  const isGrid = variant === 'grid';
  const cardWidth = isGrid ? screenWidth / 2 - themeSpacing.lg : screenWidth - themeSpacing.lg * 2;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <SkeletonRect
        width="100%"
        height={isGrid ? 160 : 200}
        borderRadius={themeBorderRadius.lg}
        animated={animated}
      />
      <View style={styles.content}>
        <SkeletonText
          width="70%"
          height={18}
          numberOfLines={1}
          animated={animated}
        />
        <SkeletonText
          width="40%"
          height={14}
          numberOfLines={1}
          animated={animated}
          spacing={themeSpacing.xs}
        />
      </View>
    </View>
  );
};

export interface MarketplaceCardSkeletonProps {
  count?: number;
  animated?: boolean;
}

export const MarketplaceCardSkeleton: React.FC<MarketplaceCardSkeletonProps> = ({
  count = 3,
  animated = true,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <NFTCardSkeleton key={index} variant="default" animated={animated} />
      ))}
    </View>
  );
};

export interface NFTSkeletonProps {
  animated?: boolean;
}

export const NFTDetailSkeleton: React.FC<NFTSkeletonProps> = ({
  animated = true,
}) => {
  return (
    <View style={styles.detailContainer}>
      <SkeletonRect
        width="100%"
        height={350}
        borderRadius={0}
        animated={animated}
      />
      <View style={styles.detailContent}>
        <SkeletonText
          width="70%"
          height={32}
          numberOfLines={1}
          animated={animated}
        />
        <SkeletonText
          width="100%"
          height={16}
          numberOfLines={3}
          animated={animated}
          spacing={themeSpacing.xs}
        />

        <View style={styles.addressSection}>
          <View style={styles.addressRow}>
            <SkeletonText width="30%" height={14} animated={animated} />
            <SkeletonRect width="60%" height={32} borderRadius={20} animated={animated} />
          </View>
          <View style={styles.addressRow}>
            <SkeletonText width="30%" height={14} animated={animated} />
            <SkeletonRect width="60%" height={32} borderRadius={20} animated={animated} />
          </View>
        </View>

        <View style={styles.attributesSection}>
          <SkeletonText width="40%" height={18} animated={animated} />
          <View style={styles.attributesGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={styles.attributeCard}>
                <SkeletonText width="80%" height={12} animated={animated} />
                <SkeletonText width="60%" height={14} animated={animated} spacing={4} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export const MyNFTsGridSkeleton: React.FC<{ count?: number; animated?: boolean }> = ({
  count = 4,
  animated = true,
}) => {
  const cardWidth = screenWidth / 2 - themeSpacing.lg;

  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.gridCard, { width: cardWidth }]}>
          <SkeletonRect
            width="100%"
            height={160}
            borderRadius={themeBorderRadius.md}
            animated={animated}
          />
          <View style={styles.gridContent}>
            <SkeletonText
              width="70%"
              height={14}
              numberOfLines={1}
              animated={animated}
            />
            <SkeletonText
              width="40%"
              height={13}
              numberOfLines={1}
              animated={animated}
              spacing={themeSpacing.xs}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

export const HomeSkeleton: React.FC = () => {
  return (
    <View style={styles.homeContainer}>
      <View style={styles.homeHeader}>
        <View>
          <SkeletonText width="50%" height={24} animated />
          <SkeletonText width="30%" height={14} animated spacing={4} />
        </View>
        <SkeletonRect width={80} height={28} borderRadius={20} animated />
      </View>

      <View style={styles.balanceCard}>
        <SkeletonText width="40%" height={14} animated />
        <SkeletonText width="60%" height={32} animated spacing={4} />
        <View style={styles.balanceRow}>
          <SkeletonText width="30%" height={12} animated />
          <SkeletonText width="30%" height={12} animated />
        </View>
      </View>

      <View style={styles.actions}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.actionCard}>
            <SkeletonCircle size={40} animated />
            <SkeletonText width="60%" height={12} numberOfLines={1} animated spacing={4} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: themeSpacing.md,
    gap: themeSpacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: themeBorderRadius.lg,
    overflow: 'hidden',
    marginBottom: themeSpacing.md,
  },
  content: {
    padding: themeSpacing.md,
  },
  detailContainer: {
    flex: 1,
  },
  detailContent: {
    padding: themeSpacing.md,
    gap: themeSpacing.md,
  },
  addressSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: themeBorderRadius.md,
    padding: themeSpacing.md,
    gap: themeSpacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attributesSection: {
    gap: themeSpacing.sm,
  },
  attributesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: themeSpacing.sm,
  },
  attributeCard: {
    flexBasis: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: themeBorderRadius.md,
    padding: themeSpacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: themeSpacing.md,
    gap: themeSpacing.md,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: themeBorderRadius.md,
    overflow: 'hidden',
  },
  gridContent: {
    padding: themeSpacing.sm,
  },
  homeContainer: {
    padding: themeSpacing.lg,
    paddingTop: 60,
    gap: themeSpacing.lg,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: themeBorderRadius.md,
    padding: themeSpacing.md,
    gap: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: themeSpacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: themeSpacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: themeBorderRadius.md,
    padding: themeSpacing.md,
    alignItems: 'center',
    gap: themeSpacing.xs,
  },
});