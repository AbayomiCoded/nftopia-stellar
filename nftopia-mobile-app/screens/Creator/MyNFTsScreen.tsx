import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useCreatorStore } from '@/stores/creatorStore';
import apiClient from '@/lib/api/sample';
import { NFT } from '@/types';
import { OptimizedImage } from '@/src/components/OptimizedImage';
import { MyNFTsGridSkeleton } from '@/src/components/skeletons';

function NFTCard({ nft, onPress }: { nft: NFT; onPress: () => void }) {
  const statusColor: Record<string, string> = {
    draft: '#999',
    minted: '#6C5CE7',
    listed: '#00B894',
    sold: '#E17055',
  };

  return (
    <TouchableOpacity style={styles.nftCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.nftImageContainer}>
        <OptimizedImage
          source={nft.imageUrl}
          size="medium"
          width="100%"
          height={160}
          resizeMode="cover"
          cacheKey={`my-nft-${nft.id}`}
          showSkeleton={true}
          lazyLoad={true}
          quality="auto"
          fallbackSource="https://via.placeholder.com/400x400/F0F0F0/999?text=No+Image"
        />
        <View style={[styles.statusBadge, { backgroundColor: statusColor[nft.status] || '#999' }]}>
          <Text style={styles.statusText}>{nft.status}</Text>
        </View>
      </View>
      <View style={styles.nftInfo}>
        <Text style={styles.nftName} numberOfLines={1}>{nft.name}</Text>
        <Text style={styles.nftPrice}>{nft.price} {nft.currency}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎨</Text>
      <Text style={styles.emptyTitle}>No NFTs Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start minting your first NFT to see it here
      </Text>
    </View>
  );
}

export default function MyNFTsScreen({ navigation }: any) {
  const { nfts, nftsLoading, nftsError, fetchMyNFTs } = useCreatorStore();

  useEffect(() => {
    fetchMyNFTs();
    apiClient.trackEvent('my_nfts_view', { timestamp: new Date().toISOString() });
  }, []);

  const onRefresh = useCallback(async () => {
    await fetchMyNFTs();
    apiClient.trackEvent('my_nfts_refresh', { timestamp: new Date().toISOString() });
  }, [fetchMyNFTs]);

  const handleNFTPress = (nftId: string) => {
    apiClient.trackEvent('nft_detail_view', { nftId });
    navigation.navigate('NFTDetail', { nftId });
  };

  const renderItem = ({ item }: { item: NFT }) => (
    <NFTCard nft={item} onPress={() => handleNFTPress(item.id)} />
  );

  if (nftsLoading && nfts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My NFTs</Text>
          <Text style={styles.headerCount}>0 total</Text>
        </View>
        <MyNFTsGridSkeleton count={4} animated={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My NFTs</Text>
        <Text style={styles.headerCount}>{nfts.length} total</Text>
      </View>
      <FlatList
        data={nfts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl refreshing={nftsLoading} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={
          nftsError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{nftsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchMyNFTs}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerCount: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  nftCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nftImageContainer: {
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  nftInfo: {
    padding: 12,
  },
  nftName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  nftPrice: {
    fontSize: 13,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#E17055',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});