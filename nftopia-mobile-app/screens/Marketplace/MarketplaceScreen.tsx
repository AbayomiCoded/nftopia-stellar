import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/MainNavigator';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useNFTs } from '@/hooks/useNFTs';
import { NFT } from '@/types';
import { OptimizedImage } from '@/src/components/OptimizedImage';
import { ErrorFallback } from '@/src/components/ErrorFallback';
import { withErrorBoundary } from '@/src/hoc/withErrorBoundary';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { ANALYTICS_EVENTS } from '@/src/analytics/config';
import { errorLogger } from '@/src/errors/logger';

function MarketplaceContent() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { nfts, loading, error, loadMore, refetch } = useNFTs();
  const { track, trackScreenView, trackPerformance } = useAnalytics();

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

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3].map(key => (
        <View key={key} style={styles.card}>
          <View style={styles.skeletonImage} />
          <View style={styles.cardContent}>
            <View style={styles.skeletonTextLong} />
            <View style={styles.skeletonTextShort} />
          </View>
        </View>
      ))}
    </View>
  );

  if (error && nfts.length === 0) {
    return (
      <ErrorFallback
        error={error}
        onRetry={() => {
          track('marketplace_refresh');
          refetch();
        }}
        customMessage="Failed to load NFTs. Please check your connection and try again."
      />
    );
  }

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
      {loading && nfts.length === 0 ? (
        renderSkeleton()
      ) : (
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
          refreshControl={
            <RefreshControl 
              refreshing={loading && nfts.length > 0} 
              onRefresh={() => {
                track('marketplace_refresh');
                refetch();
              }}
            />
          }
        />
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
  skeletonImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  skeletonTextLong: {
    height: 18,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '70%',
    marginBottom: 8,
  },
  skeletonTextShort: {
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '40%',
  },
});