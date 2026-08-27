import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/MainNavigator';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { OptimizedImage } from '@/src/components/OptimizedImage';
import { SkeletonRect, SkeletonText } from '@/src/components/skeletons';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { useNFTCard } from '@/hooks/useNFTCard';

const CARD_WIDTH = 120;
const CARD_IMAGE_SIZE = 120;

export interface RecentlyViewedRowProps {
  testID?: string;
}

interface RecentlyViewedCardProps {
  nftId: string;
  onPress: (nftId: string) => void;
  testID?: string;
}

const RecentlyViewedCard: React.FC<RecentlyViewedCardProps> = ({
  nftId,
  onPress,
  testID,
}) => {
  const { nft, loading } = useNFTCard(nftId);

  if (loading && !nft) {
    return (
      <View style={styles.card}>
        <SkeletonRect width="100%" height={CARD_IMAGE_SIZE} borderRadius={borderRadius.lg} />
        <View style={styles.cardContent}>
          <SkeletonText width="80%" height={13} spacing={4} />
        </View>
      </View>
    );
  }

  if (!nft) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => onPress(nftId)}
      accessibilityRole="button"
      accessibilityLabel={nft.name}
      testID={testID}
    >
      <OptimizedImage
        source={nft.image ?? ''}
        width="100%"
        height={CARD_IMAGE_SIZE}
        resizeMode="cover"
        cacheKey={`recently-viewed-${nft.id}`}
        showSkeleton
        lazyLoad
        quality="auto"
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {nft.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Horizontal row of the user's recently-viewed NFTs. Renders nothing at all
 * (not even the section title) when there's no history, per acceptance
 * criteria — a caller doesn't need to guard usage with a length check.
 */
const RecentlyViewedRow: React.FC<RecentlyViewedRowProps> = ({ testID }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const items = useRecentlyViewedStore((s) => s.items);
  const clearHistory = useRecentlyViewedStore((s) => s.clearHistory);

  if (items.length === 0) {
    return null;
  }

  const handleItemPress = (nftId: string) => {
    navigation.navigate('NFTDetail', { nftId });
  };

  return (
    <View style={styles.section} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{t('home.recentlyViewed.title')}</Text>
        <TouchableOpacity
          onPress={clearHistory}
          accessibilityRole="button"
          accessibilityLabel={t('home.recentlyViewed.clear')}
          testID={testID ? `${testID}-clear` : undefined}
        >
          <Text style={styles.clearText}>{t('home.recentlyViewed.clear')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.nftId}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <RecentlyViewedCard
            nftId={item.nftId}
            onPress={handleItemPress}
            testID={testID ? `${testID}-item-${item.nftId}` : undefined}
          />
        )}
      />
    </View>
  );
};

export default RecentlyViewedRow;

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
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
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
