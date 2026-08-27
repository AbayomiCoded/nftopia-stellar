import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/MainNavigator';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useNFTs } from '@/hooks/useNFTs';
import { NFT } from '@/types';
import { findCategoryById } from '@/constants/categories';
import { OptimizedImage } from '@/src/components/OptimizedImage';
import { ErrorFallback } from '@/src/components/ErrorFallback';
import { withErrorBoundary } from '@/src/hoc/withErrorBoundary';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh';
import { MarketplaceCardSkeleton } from '@/src/components/skeletons';
import { PullToRefresh } from '@/src/components/PullToRefresh';
import { ANALYTICS_EVENTS } from '@/src/analytics/config';
import { analyticsService } from '@/src/analytics/analytics.service';
import { errorLogger } from '@/src/errors/logger';

function MarketplaceContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'Marketplace'>>();
  const { nfts, loading, error, loadMore, refetch } = useNFTs();
  const { track, trackScreenView, trackPerformance } = useAnalytics();

  // Real server-side category filtering for the general NFT feed is
  // tracked separately; for now the active category from Home's discovery
  // chips is surfaced here as a visible, clearable filter indicator so the
  // navigation contract ("routes into the marketplace pre-filtered") is
  // honored end-to-end.
  const activeCategoryId = route.params?.category;
  const activeCategory = activeCategoryId ? findCategoryById(activeCategoryId) : undefined;

  const {
    isRefreshing,
    error: refreshError,
    lastUpdated,
    handleRefresh,
    getLastUpdatedText,
    isInCooldown,
    cooldownRemaining,
  } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    cooldown: 2000,
    hapticFeedback: true,
    trackAnalytics: true,
    analyticsEvent: 'marketplace_refresh',
  });

  const handleClearCategoryFilter = () => {
    track('marketplace_category_filter_clear', { categoryId: activeCategoryId });
    navigation.setParams({ category: undefined });
  };

  useEffect(() => {
    trackScreenView('Marketplace');
  }, [trackScreenView]);

  const handleNFTPress = (nft: NFT) => {
    track(ANALYTICS_EVENTS.NFT_VIEW, {
      nftId: nft.id,
      nftName: nft.name,
      price: nft.price,
      currency: nft.currency,
    });
    navigation.navigate('NFTDetail', { nftId: nft.id });
  };

  const renderItem = ({ item }: { item: NFT }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleNFTPress(item)}
    >
      <OptimizedImage
        source={item.imageUrl}
        size="medium"
        width="100%"
        height={200}
        resizeMode="cover"
        cacheKey={`marketplace-${item.id}`}
        showSkeleton={true}
        lazyLoad={true}
        quality="auto"
        onLoad={() => {
          trackPerformance('image_load_time', Date.now(), {
            nftId: item.id,
            type: 'marketplace',
          });
        }}
        onError={(err) => {
          errorLogger.log(err, 'MarketplaceImage', undefined, { nftId: item.id });
          track(ANALYTICS_EVENTS.ERROR_OCCURRED, {
            component: 'MarketplaceImage',
            nftId: item.id,
            error: err.message,
          });
        }}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name || 'Untitled NFT'}</Text>
        <Text style={styles.cardOwner}>
          Owner: {item.owner?.username || item.owner?.address || 'Unknown'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (error && nfts.length === 0) {
    return (
      <ErrorFallback
        error={error}
        onRetry={() => {
          track('marketplace_refresh');
          handleRefresh();
        }}
        customMessage="Failed to load NFTs. Please check your connection and try again."
      />
    );
  }

  const isRefreshingState = isRefreshing || (loading && nfts.length === 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            track('marketplace_back');
            navigation.goBack();
          }}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Marketplace</Text>
      </View>

      {activeCategory && (
        <View style={styles.categoryFilterBanner} testID="marketplace-category-filter">
          <Text style={styles.categoryFilterText}>
            {t(activeCategory.labelKey)}
          </Text>
          <TouchableOpacity
            onPress={handleClearCategoryFilter}
            accessibilityRole="button"
            accessibilityLabel="Clear category filter"
            testID="marketplace-category-filter-clear"
          >
            <Text style={styles.categoryFilterClear}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {isRefreshingState && nfts.length === 0 ? (
        <MarketplaceCardSkeleton count={3} animated={true} />
      ) : (
        <PullToRefresh
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          loading={loading}
          error={refreshError}
          onRetry={handleRefresh}
          lastUpdated={lastUpdated}
          getLastUpdatedText={getLastUpdatedText}
          cooldownRemaining={cooldownRemaining}
          tintColor="#6C5CE7"
          title="Pull to refresh marketplace"
        >
          <FlatList
            data={nfts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              track('marketplace_load_more', { currentCount: nfts.length });
              loadMore();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        </PullToRefresh>
      )}
    </View>
  );
}

const MarketplaceScreen = withErrorBoundary(MarketplaceContent, {
  name: 'MarketplaceScreen',
  onError: (error, errorInfo) => {
    errorLogger.log(error, 'MarketplaceScreen', undefined, { componentStack: errorInfo.componentStack });
    analyticsService.trackError(error, { componentStack: errorInfo.componentStack });
  },
});

export default MarketplaceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: 60,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  categoryFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  categoryFilterClear: {
    fontSize: 16,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardOwner: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});