import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { useOfflineStore } from '@/stores/offlineStore';

// Screens
import HomeScreen from '@/screens/Home/sample';
import CreatorDashboardScreen from '@/screens/Creator/CreatorDashboardScreen';
import MyNFTsScreen from '@/screens/Creator/MyNFTsScreen';
import MintNFTScreen from '@/screens/Creator/MintNFTScreen';
import CreateCollectionScreen from '@/screens/Creator/CreateCollectionScreen';
import EarningsScreen from '@/screens/Creator/EarningsScreen';
import NotificationsScreen from '@/screens/Notifications/NotificationsScreen';
import NotificationSettingsScreen from '@/screens/Notifications/NotificationSettingsScreen';
import SearchResultsScreen from '@/screens/Search/SearchResultsScreen';
import CollectionsScreen from '@/screens/Collections/CollectionsScreen';
import CollectionDetailScreen from '@/screens/Collections/CollectionDetailScreen';
import CreatorProfileScreen from '@/screens/Profile/CreatorProfileScreen';
import AuctionsScreen from '@/screens/Auctions/AuctionsScreen';
import AuctionDetailScreen from '@/screens/Auctions/AuctionDetailScreen';
import CreateAuctionScreen from '@/screens/Auctions/CreateAuctionScreen';

export type MainStackParamList = {
  Home: undefined;
  Marketplace: undefined;
  Profile: undefined;
  CreatorDashboard: undefined;
  MyNFTs: undefined;
  MintNFT: undefined;
  CreateCollection: undefined;
  NFTDetail: { nftId: string };
  CollectionDetail: { collectionId: string };
  EditCollection: { collectionId: string };
  Earnings: undefined;
  Transactions: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Search: undefined;
  SearchResults: undefined;
  Collections: undefined;
  CreatorProfile: { userId: string };
  Auctions: undefined;
  AuctionDetail: { auctionId: string };
  CreateAuction: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

function OfflineBanner() {
  const { isOnline } = useOfflineStore();
  if (isOnline) return null;
  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineBannerText}>You are offline. Some features may be limited.</Text>
    </View>
  );
}

export default function MainNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="CreatorDashboard" component={CreatorDashboardScreen} />
        <Stack.Screen name="MyNFTs" component={MyNFTsScreen} />
        <Stack.Screen name="MintNFT" component={MintNFTScreen} />
        <Stack.Screen name="CreateCollection" component={CreateCollectionScreen} />
        <Stack.Screen name="Earnings" component={EarningsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
        <Stack.Screen name="Collections" component={CollectionsScreen} />
        <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
        <Stack.Screen name="EditCollection" component={EditCollectionScreen} />
        <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} />
        <Stack.Screen name="Auctions" component={AuctionsScreen} />
        <Stack.Screen name="AuctionDetail" component={AuctionDetailScreen} />
        <Stack.Screen name="CreateAuction" component={CreateAuctionScreen} />
      </Stack.Navigator>
    </View>
  );
}

// Placeholder screens for development
function MarketplaceScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Marketplace</Text>
      <Text style={styles.placeholderSubtitle}>Coming Soon</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Profile</Text>
      <Text style={styles.placeholderSubtitle}>Coming Soon</Text>
    </View>
  );
}

// Placeholder screens for new features
function SearchScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Search</Text>
      <Text style={styles.placeholderSubtitle}>Use the search bar above</Text>
    </View>
  );
}

function EditCollectionScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Edit Collection</Text>
      <Text style={styles.placeholderSubtitle}>Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  placeholderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  offlineBanner: {
    backgroundColor: '#FFEAA7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  offlineBannerText: {
    color: '#D68910',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});