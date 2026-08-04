import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { persistenceManager } from '@/src/utils/persistence.manager';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface StoreInfo {
  name: string;
  size: number;
  initialized: boolean;
}

export default function PersistenceDebugScreen() {
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const status = await persistenceManager.getStatus();
      
      const storeInfo: StoreInfo[] = [
        { name: 'Auth', size: status.storeSizes['auth-storage'] || 0, initialized: status.stores.auth },
        { name: 'Notifications', size: status.storeSizes['notification-storage'] || 0, initialized: status.stores.notifications },
        { name: 'Preferences', size: status.storeSizes['preferences-storage'] || 0, initialized: status.stores.preferences },
        { name: 'Favorites', size: status.storeSizes['favorites-storage'] || 0, initialized: status.stores.favorites },
        { name: 'Offline', size: status.storeSizes['offline-storage'] || 0, initialized: status.stores.offline },
        { name: 'Language', size: status.storeSizes['language-storage'] || 0, initialized: status.stores.language },
      ];

      setStores(storeInfo);
      setTotalSize(status.totalSize);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error('Failed to load persistence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all persisted data from all stores. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await persistenceManager.clearAll();
            await loadData();
          },
        },
      ]
    );
  };

  const handleClearStore = (storeName: string) => {
    Alert.alert(
      'Clear Store',
      `This will clear persisted data from ${storeName}. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await persistenceManager.clearStore(storeName);
            await loadData();
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Persistence Manager</Text>
        <Text style={styles.subtitle}>Manage app state persistence</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Total Storage Used</Text>
        <Text style={styles.statsValue}>{formatSize(totalSize)}</Text>
        <Text style={styles.statsMeta}>Last Updated: {new Date(lastUpdated).toLocaleTimeString()}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
      >
        {stores.map((store) => (
          <View key={store.name} style={styles.storeCard}>
            <View style={styles.storeHeader}>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                <View style={[styles.statusBadge, store.initialized ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>
                    {store.initialized ? 'Active' : 'Empty'}
                  </Text>
                </View>
              </View>
              <Text style={styles.storeSize}>{formatSize(store.size)}</Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => handleClearStore(store.name)}
              disabled={!store.initialized}
            >
              <Text style={[styles.clearButtonText, !store.initialized && styles.clearButtonDisabled]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
          <Text style={styles.clearAllButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    marginTop: 60,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  statsMeta: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  storeCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  storeHeader: {
    flex: 1,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#00B89420',
  },
  statusInactive: {
    backgroundColor: '#B2BEC320',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  storeSize: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.errorBackground,
  },
  clearButtonText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  clearButtonDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 20,
  },
  refreshButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearAllButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  clearAllButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  shadows: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});