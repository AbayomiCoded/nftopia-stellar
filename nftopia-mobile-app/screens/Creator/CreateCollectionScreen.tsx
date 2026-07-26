import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCreatorStore } from '@/stores/creatorStore';
import { useOfflineStore } from '@/stores/offlineStore';
import apiClient from '@/lib/api/sample';

export default function CreateCollectionScreen({ navigation }: any) {
  const { fetchMyCollections } = useCreatorStore();
  const { addToQueue, isOnline } = useOfflineStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Collection name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImagePick = () => {
    Alert.alert('Select Image', 'Choose image source', [
      { text: 'Camera', onPress: () => setImage('file:///simulated/collection_' + Date.now() + '.jpg') },
      { text: 'Gallery', onPress: () => setImage('file:///simulated/collection_' + Date.now() + '.jpg') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = { name: name.trim(), description: description.trim(), image: image || undefined };

      if (isOnline) {
        await apiClient.createCollection(data);
        await fetchMyCollections();
      } else {
        addToQueue({ action: 'create_collection', payload: data });
      }

      apiClient.trackEvent('collection_created', { name: data.name, hasImage: !!image });

      Alert.alert(
        'Success!',
        isOnline ? 'Collection created successfully!' : 'Collection will be created when you\'re back online.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to create collection' });
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
        <Text style={styles.headerTitle}>New Collection</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Collection Image</Text>
        <TouchableOpacity style={styles.imageUpload} onPress={handleImagePick}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.uploadIcon}>📁</Text>
              <Text style={styles.uploadText}>Upload Collection Image</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Collection Name *</Text>
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          value={name}
          onChangeText={setName}
          placeholder="Enter collection name"
          placeholderTextColor="#999"
          maxLength={100}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.description ? styles.inputError : null]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your collection"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
      </View>

      {errors.submit && (
        <View style={styles.submitError}>
          <Text style={styles.submitErrorText}>{errors.submit}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.createButtonText}>
            {isOnline ? 'Create Collection' : 'Queue for Creation'}
          </Text>
        )}
      </TouchableOpacity>

      {!isOnline && (
        <View style={styles.offlineNotice}>
          <Text style={styles.offlineNoticeText}>
            You're offline. Your collection will be created when you reconnect.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
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
  textArea: { height: 100, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: '#E17055', marginTop: 4 },
  imageUpload: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePlaceholder: { alignItems: 'center', padding: 40 },
  uploadIcon: { fontSize: 48, marginBottom: 12 },
  uploadText: { fontSize: 16, color: '#666', fontWeight: '500' },
  imagePreview: { width: '100%', height: 200, resizeMode: 'cover' },
  submitError: {
    margin: 20,
    padding: 12,
    backgroundColor: '#FFE0E0',
    borderRadius: 8,
  },
  submitErrorText: { color: '#E17055', fontSize: 14, textAlign: 'center' },
  createButton: {
    margin: 20,
    backgroundColor: '#6C5CE7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  offlineNotice: {
    marginHorizontal: 20,
    padding: 12,
    backgroundColor: '#FFEAA7',
    borderRadius: 8,
  },
  offlineNoticeText: { color: '#D68910', fontSize: 13, textAlign: 'center' },
});