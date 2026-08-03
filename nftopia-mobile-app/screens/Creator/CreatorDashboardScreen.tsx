import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useCreatorStore } from '@/stores/creatorStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useOfflineStore } from '@/stores/offlineStore';
import apiClient from '@/lib/api/sample';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color: string;
  onPress?: () => void;
}

function StatCard({ title, value, subtitle, color, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

function ActivityItem({ event }: { event: any }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'sale': return '💰';
      case 'purchase': return '🛒';
      case 'mint': return '🖼️';
      case 'listing': return '📋';
      case 'offer': return '💎';
      case 'transfer': return '↔️';
      default: return '📌';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.activityItem}>
      <Text style={styles.activityIcon}>{getIcon(event.type)}</Text>
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>
          <Text style={styles.activityAction}>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</Text>
          {' '}{event.nftName}
        </Text>
        <Text style={styles.activityTime}>{formatTime(event.timestamp)}</Text>
      </View>
      {event.price && (
        <Text style={styles.activityPrice}>
          {event.price} {event.currency}
        </Text>
      )}
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonRow}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '60%', marginTop: 8 }]} />
          </View>
        ))}
      </View>
      <View style={styles.skeletonRow}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '60%', marginTop: 8 }]} />
          </View>
        ))}
      </View>
      <View style={styles.skeletonActivity}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonActivityItem}>
            <View style={styles.skeletonCircle} />
            <View style={{ flex: 1 }}>
              <View style={[styles.skeletonLine, { width: '70%' }]} />
              <View style={[styles.skeletonLine, { width: '40%', marginTop: 4 }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function CreatorDashboardScreen({ navigation }: any) {
  const {
    stats,
    activityFeed,
    statsLoading,
    statsError,
    fetchDashboardStats,
    fetchActivityFeed,
    refreshAll,
  } = useCreatorStore();

  const { unreadCount } = useNotificationStore();
  const { isOnline } = useOfflineStore();

  useEffect(() => {
    fetchDashboardStats();
    fetchActivityFeed();
    // Track telemetry
    apiClient.trackEvent('creator_dashboard_view', { timestamp: new Date().toISOString() });
  }, []);

  const onRefresh = useCallback(async () => {
    await refreshAll();
    apiClient.trackEvent('creator_dashboard_refresh', { timestamp: new Date().toISOString() });
  }, [refreshAll]);

  const navigateToScreen = (screen: string) => {
    apiClient.trackEvent('creator_dashboard_navigate', { screen });
    navigation.navigate(screen);
  };

  if (statsLoading && !stats) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Creator Dashboard</Text>
          {!isOnline && <View style={styles.offlineBadge}><Text style={styles.offlineBadgeText}>Offline</Text></View>}
        </View>
        <LoadingSkeleton />
      </ScrollView>
    );
  }

  if (statsError && !stats) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Creator Dashboard</Text>
        </View>
        <ErrorState message={statsError} onRetry={fetchDashboardStats} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={statsLoading} onRefresh={onRefresh} tintColor="#6C5CE7" />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Creator Dashboard</Text>
          <Text style={styles.headerSubtitle}>Manage your NFTs and collections</Text>
        </View>
        {!isOnline && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total NFTs"
          value={stats?.totalNfts?.toString() || '0'}
          color="#6C5CE7"
          onPress={() => navigateToScreen('MyNFTs')}
        />
        <StatCard
          title="Collections"
          value={stats?.totalCollections?.toString() || '0'}
          color="#00B894"
          onPress={() => navigateToScreen('CreateCollection')}
        />
        <StatCard
          title="Total Earnings"
          value={`${stats?.totalEarnings || '0'} XLM`}
          color="#FDCB6E"
          onPress={() => navigateToScreen('Earnings')}
        />
        <StatCard
          title="Total Sales"
          value={stats?.totalSales?.toString() || '0'}
          color="#E17055"
          subtitle={`Floor: ${stats?.floorPrice || '0'} XLM`}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToScreen('MintNFT')}
          >
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionLabel}>Mint NFT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToScreen('CreateCollection')}
          >
            <Text style={styles.actionIcon}>📁</Text>
            <Text style={styles.actionLabel}>New Collection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToScreen('MyNFTs')}
          >
            <Text style={styles.actionIcon}>🎨</Text>
            <Text style={styles.actionLabel}>My NFTs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToScreen('Earnings')}
          >
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionLabel}>Earnings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Activity Feed */}
      <View style={styles.activitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={fetchActivityFeed}>
            <Text style={styles.seeAllText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {activityFeed.length === 0 ? (
          <EmptyState
            title="No Activity Yet"
            subtitle="Your recent actions will appear here"
          />
        ) : (
          activityFeed.slice(0, 10).map((event) => (
            <ActivityItem key={event.id} event={event} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  offlineBadge: {
    backgroundColor: '#FFEAA7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  offlineBadgeText: {
    fontSize: 12,
    color: '#D68910',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '23%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  activitySection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  activityItem: {
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
  activityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  activityAction: {
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  activityPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00B894',
  },
  // Skeleton
  skeletonContainer: {
    padding: 20,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  skeletonCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    height: 80,
  },
  skeletonLine: {
    backgroundColor: '#D0D0D0',
    height: 12,
    borderRadius: 6,
    width: '80%',
  },
  skeletonActivity: {
    marginTop: 20,
  },
  skeletonActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
    marginRight: 12,
  },
  // Error
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});