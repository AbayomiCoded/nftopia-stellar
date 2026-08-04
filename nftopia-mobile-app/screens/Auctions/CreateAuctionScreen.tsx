import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuctionStore } from '@/stores/auctionStore';
import { useCreatorStore } from '@/stores/creatorStore';
import apiClient from '@/lib/api/sample';

export default function CreateAuctionScreen({ navigation }: any) {
  const { createAuction } = useAuctionStore();
  const creatorStore: any = useCreatorStore();
  const [form, setForm] = useState({
    nftId: '',
    startPrice: '',
    reservePrice: '',
    currency: 'XLM',
    duration: '24', // hours
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableNFTs = ((creatorStore.myNfts || []) as any[]).filter((nft) => nft.status === 'minted' || nft.status === 'listed');

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.nftId) newErrors.nftId = 'Please select an NFT';
    if (!form.startPrice || isNaN(Number(form.startPrice)) || Number(form.startPrice) <= 0) {
      newErrors.startPrice = 'Valid start price is required';
    }
    if (form.reservePrice && Number(form.reservePrice) > 0 && Number(form.reservePrice) < Number(form.startPrice)) {
      newErrors.reservePrice = 'Reserve must be >= start price';
    }
    if (!form.duration || isNaN(Number(form.duration)) || Number(form.duration) < 1) {
      newErrors.duration = 'Duration must be at least 1 hour';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const auction = await createAuction({
        nftId: form.nftId,
        startPrice: form.startPrice,
        reservePrice: form.reservePrice || undefined,
        currency: form.currency,
        duration: Number(form.duration),
      });
      apiClient.trackEvent('auction_created_screen', { auctionId: auction.id, duration: form.duration });
      Alert.alert('Success', 'Auction created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('AuctionDetail', { auctionId: auction.id }) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Auction</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Select NFT *</Text>
        <View style={styles.nftPicker}>
          {(availableNFTs || []).map((nft: any) => (
            <TouchableOpacity
              key={nft.id}
              style={[styles.nftOption, form.nftId === nft.id ? styles.nftOptionActive : null]}
              onPress={() => setForm({ ...form, nftId: nft.id })}
            >
              <Text style={[styles.nftOptionText, form.nftId === nft.id ? styles.nftOptionTextActive : null]}>
                {nft.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.nftId && <Text style={styles.errorText}>{errors.nftId}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Start Price * ({form.currency})</Text>
        <TextInput
          style={[styles.input, errors.startPrice ? styles.inputError : null]}
          value={form.startPrice}
          onChangeText={(v) => setForm({ ...form, startPrice: v })}
          placeholder="0.00"
          keyboardType="decimal-pad"
          placeholderTextColor="#999"
        />
        {errors.startPrice && <Text style={styles.errorText}>{errors.startPrice}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Reserve Price (Optional)</Text>
        <TextInput
          style={[styles.input, errors.reservePrice ? styles.inputError : null]}
          value={form.reservePrice}
          onChangeText={(v) => setForm({ ...form, reservePrice: v })}
          placeholder="Minimum acceptable price"
          keyboardType="decimal-pad"
          placeholderTextColor="#999"
        />
        {errors.reservePrice && <Text style={styles.errorText}>{errors.reservePrice}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Duration (hours) *</Text>
        <TextInput
          style={[styles.input, errors.duration ? styles.inputError : null]}
          value={form.duration}
          onChangeText={(v) => setForm({ ...form, duration: v })}
          placeholder="24"
          keyboardType="number-pad"
          placeholderTextColor="#999"
        />
        {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Currency</Text>
        <View style={styles.currencyRow}>
          {['XLM', 'USDC'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyOption, form.currency === c && styles.currencyOptionActive]}
              onPress={() => setForm({ ...form, currency: c })}
            >
              <Text style={[styles.currencyText, form.currency === c && styles.currencyTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.createButtonText}>Create Auction</Text>
        )}
      </TouchableOpacity>
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
  section: { padding: 20, paddingBottom: 0 },
  label: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
  inputError: { borderColor: '#E17055' },
  errorText: { fontSize: 12, color: '#E17055', marginTop: 4 },
  nftPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nftOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  nftOptionActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  nftOptionText: { fontSize: 14, color: '#666' },
  nftOptionTextActive: { color: '#FFFFFF', fontWeight: '600' },
  currencyRow: { flexDirection: 'row', gap: 8 },
  currencyOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  currencyOptionActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  currencyText: { fontSize: 14, color: '#666', fontWeight: '500' },
  currencyTextActive: { color: '#FFFFFF' },
  createButton: {
    margin: 20,
    backgroundColor: '#6C5CE7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});