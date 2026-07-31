import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { useOfflineStore } from '@/stores/offlineStore';

// Screens - HEAD branch
import HomeScreen from '@/screens/Home/HomeScreen';
import CreatorDashboardScreen from '@/screens/Creator/CreatorDashboardScreen';
import MyNFTsScreen from '@/screens/Creator/MyNFTsScreen';
import MintNFTScreen from '@/screens/Creator/MintNFTScreen';
import CreateCollectionScreen from '@/screens/Creator/CreateCollectionScreen';
import EarningsScreen from '@/screens/Creator/EarningsScreen';
import NotificationsScreen from '@/screens/Notifications/NotificationsScreen';
import NotificationSettingsScreen from '@/screens/Notifications/NotificationSettingsScreen';

// Screens - upstream/main branch
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import WalletManagementScreen from '@/screens/Profile/WalletManagementScreen';
import MarketplaceScreen from '@/screens/Marketplace/MarketplaceScreen';
import NFTDetailScreen from '@/screens/Marketplace/NFTDetailScreen';

export type MainStackParamList = {
  Home: undefined;
  WalletManagement: undefined;
  Profile: undefined;
  CreatorDashboard: undefined;
  MyNFTs: undefined;
  MintNFT: undefined;
  CreateCollection: undefined;
  NFTDetail: { nftId: string };
  CollectionDetail: { collectionId: string };
  Earnings: undefined;
  Transactions: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Marketplace: undefined;
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
        {/* Core Screens */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="WalletManagement" component={WalletManagementScreen} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        <Stack.Screen name="NFTDetail" component={NFTDetailScreen} />

        {/* Creator Screens */}
        <Stack.Screen name="CreatorDashboard" component={CreatorDashboardScreen} />
        <Stack.Screen name="MyNFTs" component={MyNFTsScreen} />
        <Stack.Screen name="MintNFT" component={MintNFTScreen} />
        <Stack.Screen name="CreateCollection" component={CreateCollectionScreen} />
        <Stack.Screen name="Earnings" component={EarningsScreen} />

        {/* Notification Screens */}
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      </Stack.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
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