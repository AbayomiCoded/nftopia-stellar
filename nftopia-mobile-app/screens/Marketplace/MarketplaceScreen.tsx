import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/MainNavigator';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useNFTs } from '@/hooks/useNFTs';
import { NFT } from '@/types';
import { OptimizedImage } from '@/src/components/OptimizedImage';

export default function MarketplaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { nfts, loading, error, loadMore, refetch } = useNFTs();

  const renderItem = ({ item }: { item: NFT }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('NFTDetail', { nftId: item.id })}
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
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardOwner}>Owner: {item.owner.username || item.owner.address}</Text>
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

  const renderError = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>
        {error?.message || 'Something went wrong fetching NFTs.'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Marketplace</Text>
      </View>
      {error && nfts.length === 0 ? (
        renderError()
      ) : loading && nfts.length === 0 ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={nfts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={loading && nfts.length > 0} onRefresh={refetch} />
          }
        />
      )}
    </View>
  );
}

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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: '#FFF',
    fontWeight: 'bold',
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