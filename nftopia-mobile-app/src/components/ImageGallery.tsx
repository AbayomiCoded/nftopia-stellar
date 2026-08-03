import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Modal,
  ViewToken,
} from 'react-native';
import { OptimizedImage } from './OptimizedImage';
import { colors, spacing } from '@/constants/theme';

interface ImageGalleryProps {
  images: string[];
  initialIndex?: number;
  showThumbnails?: boolean;
  onClose?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function ImageGallery({
  images,
  initialIndex = 0,
  showThumbnails = true,
  onClose,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [modalVisible, setModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== undefined) {
        setCurrentIndex(index);
      }
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const renderImage = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <View style={styles.imageContainer}>
        <OptimizedImage
          source={item}
          size="large"
          width={screenWidth - 32}
          height={screenHeight * 0.7}
          resizeMode="contain"
          cacheKey={`gallery-${index}`}
          showSkeleton={true}
          lazyLoad={index > 2}
          quality="high"
        />
      </View>
    ),
    []
  );

  const renderThumbnail = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <TouchableOpacity
        style={[styles.thumbnail, currentIndex === index && styles.thumbnailActive]}
        onPress={() => {
          setCurrentIndex(index);
          flatListRef.current?.scrollToIndex({ index, animated: true });
        }}
      >
        <OptimizedImage
          source={item}
          size="thumbnail"
          width={60}
          height={60}
          resizeMode="cover"
          cacheKey={`thumb-${index}`}
          showSkeleton={true}
          lazyLoad={index > 5}
          quality="low"
        />
      </TouchableOpacity>
    ),
    [currentIndex]
  );

  const openGallery = useCallback(() => {
    setModalVisible(true);
  }, []);

  const closeGallery = useCallback(() => {
    setModalVisible(false);
    if (onClose) onClose();
  }, [onClose]);

  return (
    <>
      {/* Image preview */}
      <TouchableOpacity onPress={openGallery}>
        <OptimizedImage
          source={images[initialIndex] || images[0]}
          size="medium"
          width="100%"
          height={200}
          resizeMode="cover"
          cacheKey="gallery-preview"
          showSkeleton={true}
          quality="medium"
        />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeGallery}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={closeGallery}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={images}
            renderItem={renderImage}
            keyExtractor={(item, index) => `gallery-${index}-${item}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            style={styles.galleryList}
          />

          {showThumbnails && images.length > 1 && (
            <View style={styles.thumbnailStrip}>
              <FlatList
                data={images}
                renderItem={renderThumbnail}
                keyExtractor={(item, index) => `thumb-${index}-${item}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailStripContent}
              />
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageCounter: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  galleryList: {
    flex: 1,
  },
  imageContainer: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailStrip: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  thumbnailStripContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#6C5CE7',
  },
});