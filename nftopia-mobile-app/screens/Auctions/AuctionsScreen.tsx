import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuctionStore } from '@/stores/auctionStore';
import apiClient from '@/lib/api/sample';
import { Auction } from '@/types';

function AuctionCard({ auction, onPress }: { auction: Auction; onPress: () => void }) {
  const getTimeRemaining = (endTime: string) => {
    const remaining = new Date(endTime).getTime() - Date.now();
    if (remaining <= 0) return 'Ended';
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isEndingSoon = new Date(auction.endTime).getTime() - Date.now() < 3600000;

  return (
    <TouchableOpacity style={styles.auctionCard} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: auction.nftImage }} style={styles.auctionImage} />
      <View style={styles.auctionInfo}>
        <Text style={styles.auctionName} numberOfLines={1}>{auction.nftName}</Text>
        <Text style={styles.auctionCreator}>by {auction.creatorName}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>{auction.currentPrice} {auction.currency}</Text>
          <Text style={styles.bidCount}>{auction.bidCount} bids</Text>
        </View>
        <View style={styles.footer}>
          <View style={[styles.timerBadge, isEndingSoon && styles.timerUrgent]}>
            <Text style={[styles.timerText, isEndingSoon && styles.timerTextUrgent]}>
              {getTimeRemaining(auction.endTime)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: auction.status === 'active' ? '#E8F8F5' : '#FFF3E0' }]}>
            <Text style={[styles.statusText, { color: auction.status === 'active' ? '#00B894' : '#F39C12' }]}>
              {auction.status === 'active' ? 'Active' : auction.status === 'ending_soon' ? 'Ending Soon' : 'Ended'}
            </Text>
          </View>
        </View>
      </View>
      {auction.isWatched && <Text style={styles.watchIcon}>👁️</Text>}
    </TouchableOpacity>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'ending_soon', label: 'Ending Soon' },
  { key: 'ended', label: 'Ended' },
];

export default function AuctionsScreen({ navigation }: any) {
  const { auctions, loading, error, fetchAuctions } = useAuctionStore();
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchAuctions();
    apiClient.trackEvent('auctions_view', { timestamp: new Date().toISOString() });
  }, []);

  const onRefresh = useCallback(() => {
    fetchAuctions(activeFilter !== 'all' ? { status: activeFilter } : undefined);
  }, [fetchAuctions, activeFilter]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    fetchAuctions(filter !== 'all' ? { status: filter } : undefined);
    apiClient.trackEvent('auctions_filter', { filter });
  };

  const filteredAuctions = activeFilter === 'all' 
    ? auctions 
    : auctions.filter((a) => a.status === activeFilter);

  const renderItem = ({ item }: { item: Auction }) => (
    <AuctionCard
      auction={item}
      onPress={() => {
        apiClient.trackEvent('auction_detail_view', { auctionId: item.id });
        navigation.navigate('AuctionDetail', { auctionId: item.id });
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Auctions</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateAuction')}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => handleFilterChange(f.key)}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredAuctions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
        ListEmptyComponent={
          loading ? <LoadingSkeleton /> : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔨</Text>
              <Text style={styles.emptyTitle}>No Auctions</Text>
              <Text style={styles.emptySubtitle}>Active auctions will appear here</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  createButton: { backgroundColor: '#6C5CE7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  createButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  filters: { flexDirection: 'row', padding: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F0F0F0' },
  filterChipActive: { backgroundColor: '#6C5CE7' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16 },
  auctionCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  auctionImage: { width: 100, height: 100, borderRadius: 10, marginRight: 12 },
  auctionInfo: { flex: 1 },
  auctionName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  auctionCreator: { fontSize: 12, color: '#666', marginTop: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  currentPrice: { fontSize: 18, fontWeight: 'bold', color: '#6C5CE7' },
  bidCount: { fontSize: 12, color: '#999' },
  footer: { flexDirection: 'row', gap: 8, marginTop: 8 },
  timerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F0F0F0' },
  timerUrgent: { backgroundColor: '#FFE0E0' },
  timerText: { fontSize: 12, color: '#666', fontWeight: '500' },
  timerTextUrgent: { color: '#E17055' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '500' },
  watchIcon: { position: 'absolute', top: 8, right: 8, fontSize: 16 },
  skeletonContainer: { padding: 16 },
  skeletonCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10 },
  skeletonImage: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#E8E8E8', marginRight: 12 },
  skeletonInfo: { flex: 1, justifyContent: 'center' },
  skeletonLine: { height: 14, backgroundColor: '#E8E8E8', borderRadius: 7 },
  emptyContainer: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  errorContainer: { alignItems: 'center', padding: 20 },
  errorText: { fontSize: 14, color: '#E17055', marginBottom: 12, textAlign: 'center' },
  retryButton: { backgroundColor: '#6C5CE7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
});