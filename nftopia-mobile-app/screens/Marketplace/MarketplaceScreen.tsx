import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/MainNavigator';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

export interface NFT {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  creator: string;
  owner: string;
  attributes: { trait_type: string; value: string }[];
  history: TransferEvent[];
}

export interface TransferEvent {
  id: string;
  type: 'mint' | 'transfer' | 'sale';
  fromAddress?: string;
  toAddress: string;
  date: string;
  price?: string;
  transactionHash: string;
}

// Mock data for Marketplace
export const MOCK_NFTS: NFT[] = [
  {
    id: '1',
    name: 'Cosmic Stellar #1',
    description: 'A beautiful digital artwork representing the Stellar network ecosystem in a cosmic style.',
    imageUrl: 'https://picsum.photos/id/1018/400/400',
    creator: 'GAHQ7...XYZ',
    owner: 'GBDX3...ABC',
    attributes: [
      { trait_type: 'Background', value: 'Deep Space' },
      { trait_type: 'Rarity', value: 'Legendary' },
      { trait_type: 'Planet', value: 'Stellar' }
    ],
    history: [
      { id: 'ev1', type: 'mint', toAddress: 'GAHQ7...XYZ', date: '2023-10-01T12:00:00Z', transactionHash: '0x123...' },
      { id: 'ev2', type: 'sale', fromAddress: 'GAHQ7...XYZ', toAddress: 'GBDX3...ABC', date: '2023-10-15T15:30:00Z', price: '500 XLM', transactionHash: '0x456...' }
    ]
  },
  {
    id: '2',
    name: 'Abstract Node',
    description: 'An abstract visualization of a validator node processing transactions.',
    imageUrl: 'https://picsum.photos/id/1043/400/400',
    creator: 'GAHQ7...XYZ',
    owner: 'GCXY9...DEF',
    attributes: [
      { trait_type: 'Color', value: 'Neon Green' },
      { trait_type: 'Type', value: 'Abstract' }
    ],
    history: [
      { id: 'ev3', type: 'mint', toAddress: 'GAHQ7...XYZ', date: '2023-11-05T09:20:00Z', transactionHash: '0x789...' }
    ]
  }
];

export default function MarketplaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const renderItem = ({ item }: { item: NFT }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('NFTDetail', { nftId: item.id })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardOwner}>Owner: {item.owner}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Marketplace</Text>
      </View>
      <FlatList
        data={MOCK_NFTS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
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
});
