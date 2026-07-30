import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { TransferEvent } from '@/types';

interface TransferHistoryProps {
  events: TransferEvent[];
  isLoading: boolean;
}

export default function TransferHistory({ events, isLoading }: TransferHistoryProps) {
  
  const openExplorer = (txHash: string) => {
    // For Stellar, typically it's stellar.expert
    const url = `https://stellar.expert/explorer/public/tx/${txHash}`;
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTextLong} />
            <View style={styles.skeletonTextShort} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📜</Text>
      <Text style={styles.emptyStateText}>No transfer history found</Text>
    </View>
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'mint': return '✨';
      case 'sale': return '💰';
      case 'transfer': return '🔄';
      default: return '📄';
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 5)}...${address.substring(address.length - 4)}`;
  };

  const renderItem = ({ item }: { item: TransferEvent }) => (
    <View style={styles.eventItem}>
      <View style={styles.eventIconContainer}>
        <Text style={styles.eventIcon}>{getEventIcon(item.type)}</Text>
      </View>
      <View style={styles.eventDetails}>
        <Text style={styles.eventType}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
        <Text style={styles.eventDate}>{new Date(item.date).toLocaleDateString()}</Text>
        
        {item.type === 'mint' && (
          <Text style={styles.eventSubText}>To: {formatAddress(item.toAddress)}</Text>
        )}
        
        {(item.type === 'sale' || item.type === 'transfer') && (
          <Text style={styles.eventSubText}>
            {item.fromAddress ? `${formatAddress(item.fromAddress)} → ` : ''}{formatAddress(item.toAddress)}
          </Text>
        )}
        
        {item.price && (
          <Text style={styles.eventPrice}>{item.price}</Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.explorerButton} 
        onPress={() => openExplorer(item.transactionHash)}
      >
        <Text style={styles.explorerIcon}>🔗</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return renderSkeleton();
  }

  if (!events || events.length === 0) {
    return renderEmptyState();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Provenance</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // usually rendered inside a ScrollView in detail screen
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventIcon: {
    fontSize: 20,
  },
  eventDetails: {
    flex: 1,
  },
  eventType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  eventDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  eventSubText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  explorerButton: {
    padding: spacing.sm,
  },
  explorerIcon: {
    fontSize: 20,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  skeletonContainer: {
    marginTop: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    marginRight: spacing.md,
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonTextLong: {
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '60%',
  },
  skeletonTextShort: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '40%',
  },
});
