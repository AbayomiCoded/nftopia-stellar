import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useCreatorStore } from '@/stores/creatorStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useOfflineStore } from '@/stores/offlineStore';
import apiClient from '@/lib/api/sample';

function ActivityFeedItem({ event }: { event: any }) {
  const typeIcons: Record<string, string> = {
    sale: '💰',
    purchase: '🛒',
    mint: '🖼️',
    listing: '📋',
    offer: '💎',
    transfer: '↔️',
    outbid: '🔨',
    follow: '👤',
    auction_end: '⏰',
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <View style={styles.feedItem}>
      <View style={styles.feedIconContainer}>
        <Text style={styles.feedIcon}>{typeIcons[event.type] || '📌'}</Text>
      </View>
      <View style={styles.feedContent}>
        <Text style={styles.feedText}>
          <Text style={styles.feedAction}>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</Text>
          {' '}{event.nftName}
        </Text>
        <Text style={styles.feedTime}>{formatTime(event.timestamp)}</Text>
      </View>
      {event.price && (
        <Text style={styles.feedPrice}>{event.price} {event.currency}</Text>
      )}
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { activityFeed, fetchActivityFeed, refreshAll } = useCreatorStore();
  const { unreadCount } = useNotificationStore();

  useEffect(() => {
    fetchActivityFeed();
    apiClient.trackEvent('home_view', { timestamp: new Date().toISOString() });
  }, []);

  const onRefresh = useCallback(async () => {
    await refreshAll();
    apiClient.trackEvent('home_refresh', { timestamp: new Date().toISOString() });
  }, [refreshAll]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#6C5CE7" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.headerTitle}>NFTopia</Text>
        <TouchableOpacity
          style={styles.notificationBell}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{activityFeed.length || 0}</Text>
          <Text style={styles.statLabel}>Activities</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Notifications</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>--</Text>
          <Text style={styles.statLabel}>NFTs</Text>
        </View>
      </View>

      {/* Activity Feed */}
      <View style={styles.feedSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity Feed</Text>
          <TouchableOpacity onPress={fetchActivityFeed}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {activityFeed.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Recent Activity</Text>
            <Text style={styles.emptySubtitle}>
              Start exploring to see activity here
            </Text>
          </View>
        ) : (
          activityFeed.slice(0, 20).map((event) => (
            <ActivityFeedItem key={event.id} event={event} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 14,
    color: '#666',
    position: 'absolute',
    top: 40,
    left: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginTop: 14 },
  notificationBell: { padding: 8, position: 'relative' },
  bellIcon: { fontSize: 24 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E17055',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#E8E8E8' },
  feedSection: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  refreshText: { fontSize: 14, color: '#6C5CE7', fontWeight: '500' },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  feedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedIcon: { fontSize: 18 },
  feedContent: { flex: 1 },
  feedText: { fontSize: 14, color: '#1A1A1A' },
  feedAction: { fontWeight: '600' },
  feedTime: { fontSize: 12, color: '#999', marginTop: 2 },
  feedPrice: { fontSize: 14, fontWeight: '600', color: '#00B894' },
  emptyFeed: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
});