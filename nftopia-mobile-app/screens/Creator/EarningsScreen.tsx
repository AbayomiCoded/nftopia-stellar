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
import apiClient from '@/lib/api/sample';
import { Transaction } from '@/types';

function TransactionItem({ tx }: { tx: Transaction }) {
  const typeColors: Record<string, string> = {
    sale: '#00B894',
    purchase: '#E17055',
    mint: '#6C5CE7',
    royalty: '#FDCB6E',
  };

  const typeIcons: Record<string, string> = {
    sale: '💰',
    purchase: '🛒',
    mint: '🖼️',
    royalty: '👑',
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.transactionItem}>
      <Text style={styles.txIcon}>{typeIcons[tx.type] || '📌'}</Text>
      <View style={styles.txContent}>
        <View style={styles.txHeader}>
          <Text style={[styles.txType, { color: typeColors[tx.type] || '#666' }]}>
            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
          </Text>
          <Text style={styles.txAmount}>
            {tx.type === 'sale' ? '+' : '-'}{tx.amount} {tx.currency}
          </Text>
        </View>
        <Text style={styles.txName}>{tx.nftName}</Text>
        <Text style={styles.txTime}>{formatTime(tx.timestamp)}</Text>
        <View style={[styles.txStatus, { backgroundColor: tx.status === 'completed' ? '#E8F8F5' : '#FFF3E0' }]}>
          <Text style={[styles.txStatusText, { color: tx.status === 'completed' ? '#00B894' : '#F39C12' }]}>
            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💰</Text>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptySubtitle}>Your earnings and transactions will appear here</Text>
    </View>
  );
}

export default function EarningsScreen({ navigation }: any) {
  const {
    totalEarnings,
    pendingEarnings,
    totalSales,
    transactions,
    earningsLoading,
    earningsError,
    fetchEarnings,
    fetchTransactions,
  } = useCreatorStore();

  useEffect(() => {
    fetchEarnings();
    fetchTransactions();
    apiClient.trackEvent('earnings_view', { timestamp: new Date().toISOString() });
  }, []);

  const onRefresh = useCallback(async () => {
    await Promise.all([fetchEarnings(), fetchTransactions()]);
    apiClient.trackEvent('earnings_refresh', { timestamp: new Date().toISOString() });
  }, [fetchEarnings, fetchTransactions]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={earningsLoading} onRefresh={onRefresh} tintColor="#6C5CE7" />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Earnings Summary */}
      <View style={styles.earningsSummary}>
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsValue}>{totalEarnings} XLM</Text>
        </View>
        <View style={styles.earningsRow}>
          <View style={[styles.earningsCard, styles.earningsCardSmall]}>
            <Text style={styles.earningsLabel}>Pending</Text>
            <Text style={styles.earningsValueSmall}>{pendingEarnings} XLM</Text>
          </View>
          <View style={[styles.earningsCard, styles.earningsCardSmall]}>
            <Text style={styles.earningsLabel}>Total Sales</Text>
            <Text style={styles.earningsValueSmall}>{totalSales}</Text>
          </View>
        </View>
      </View>

      {/* Transaction History */}
      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions.length === 0 ? (
          <EmptyState />
        ) : (
          transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
        )}
      </View>

      {earningsError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{earningsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchEarnings}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: { fontSize: 16, color: '#6C5CE7', fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  earningsSummary: { padding: 20 },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  earningsCardSmall: { flex: 1 },
  earningsRow: { flexDirection: 'row', gap: 12 },
  earningsLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  earningsValue: { fontSize: 32, fontWeight: 'bold', color: '#00B894' },
  earningsValueSmall: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  transactionsSection: { padding: 20, paddingTop: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  transactionItem: {
    flexDirection: 'row',
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
  txIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  txContent: { flex: 1 },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txType: { fontSize: 14, fontWeight: '600' },
  txAmount: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  txName: { fontSize: 13, color: '#666', marginBottom: 2 },
  txTime: { fontSize: 11, color: '#999', marginBottom: 4 },
  txStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txStatusText: { fontSize: 11, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  errorContainer: { alignItems: 'center', padding: 20 },
  errorText: { fontSize: 14, color: '#E17055', marginBottom: 12, textAlign: 'center' },
  retryButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
});