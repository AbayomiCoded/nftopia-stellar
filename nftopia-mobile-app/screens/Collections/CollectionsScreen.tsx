import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import apiClient from '@/lib/api/sample';
import { Collection } from '@/types';

function CollectionCard({ collection, onPress }: { collection: Collection; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.collectionCard} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: collection.imageUrl }} style={styles.collectionImage} />
      <View style={styles.collectionInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.collectionName} numberOfLines={1}>{collection.name}</Text>
          {collection.isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
        </View>
        <Text style={styles.collectionCreator}>{collection.creator?.username || 'Unknown'}</Text>
        <View style={styles.collectionStats}>
          <Text style={styles.statText}>{collection.nftCount} NFTs</Text>
          {collection.floorPrice && <Text style={styles.statText}>Floor: {collection.floorPrice} XLM</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonInfo}>
            <View style={[styles.skeletonLine, { width: '70%' }]} />
            <View style={[styles.skeletonLine, { width: '50%', marginTop: 6 }]} />
            <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function CollectionsScreen({ navigation }: any) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchCollections = useCallback(async (pageNum: number = 1, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getCollections(pageNum, 20, search);
      if (pageNum === 1) {
        setCollections(data);
      } else {
        setCollections((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 20);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections(1, searchQuery);
    apiClient.trackEvent('collections_view', { timestamp: new Date().toISOString() });
  }, []);

  const onRefresh = useCallback(() => {
    fetchCollections(1, searchQuery);
  }, [fetchCollections, searchQuery]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    fetchCollections(1, text);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchCollections(page + 1, searchQuery);
    }
  };

  const renderItem = ({ item }: { item: Collection }) => (
    <CollectionCard
      collection={item}
      onPress={() => {
        apiClient.trackEvent('collection_detail_view', { collectionId: item.id });
        navigation.navigate('CollectionDetail', { collectionId: item.id });
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collections</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search collections..."
          placeholderTextColor="#999"
        />
      </View>

      <FlatList
        data={collections}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading && page === 1} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? <LoadingSkeleton /> : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyTitle}>No Collections</Text>
              <Text style={styles.emptySubtitle}>Collections will appear here</Text>
            </View>
          )
        }
        ListFooterComponent={
          error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
  searchInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
  },
  listContent: { padding: 16 },
  collectionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  collectionImage: { width: 80, height: 80, borderRadius: 10, marginRight: 12 },
  collectionInfo: { flex: 1, justifyContent: 'center' },
  collectionName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  verifiedBadge: { fontSize: 12, color: '#6C5CE7', backgroundColor: '#6C5CE720', paddingHorizontal: 4, borderRadius: 4, marginLeft: 4, overflow: 'hidden' },
  collectionCreator: { fontSize: 13, color: '#666', marginTop: 2 },
  collectionStats: { flexDirection: 'row', gap: 12, marginTop: 6 },
  statText: { fontSize: 12, color: '#999' },
  skeletonContainer: { padding: 16 },
  skeletonCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10 },
  skeletonImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#E8E8E8', marginRight: 12 },
  skeletonInfo: { flex: 1, justifyContent: 'center' },
  skeletonLine: { height: 12, backgroundColor: '#E8E8E8', borderRadius: 6 },
  emptyContainer: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  errorContainer: { alignItems: 'center', padding: 20 },
  errorText: { fontSize: 14, color: '#E17055', marginBottom: 12, textAlign: 'center' },
  retryButton: { backgroundColor: '#6C5CE7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
});