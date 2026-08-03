import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/stores/notificationStore';
import { useOfflineStore } from '@/stores/offlineStore';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { errorLogger } from '@/src/errors/logger';

// Core Screens
import HomeScreen from '@/screens/Home/HomeScreen';
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import WalletManagementScreen from '@/screens/Profile/WalletManagementScreen';
import MarketplaceScreen from '@/screens/Marketplace/MarketplaceScreen';
import NFTDetailScreen from '@/screens/Marketplace/NFTDetailScreen';

// Creator Screens
import CreatorDashboardScreen from '@/screens/Creator/CreatorDashboardScreen';
import MyNFTsScreen from '@/screens/Creator/MyNFTsScreen';
import MintNFTScreen from '@/screens/Creator/MintNFTScreen';
import CreateCollectionScreen from '@/screens/Creator/CreateCollectionScreen';
import EarningsScreen from '@/screens/Creator/EarningsScreen';

// Notification Screens
import NotificationsScreen from '@/screens/Notifications/NotificationsScreen';
import NotificationSettingsScreen from '@/screens/Notifications/NotificationSettingsScreen';

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
  const { t } = useTranslation();
  const { isOnline } = useOfflineStore();
  if (isOnline) return null;
  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineBannerText}>{t('common.offline')}</Text>
    </View>
  );
}

function ScreenErrorBoundary({ children, name }: { children: React.ReactNode; name: string }) {
  return (
    <ErrorBoundary
      name={name}
      onError={(error, errorInfo) => {
        errorLogger.log(
          error,
          name,
          undefined,
          { componentStack: errorInfo.componentStack }
        );
      }}
    >
      {children}
    </ErrorBoundary>
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
        <Stack.Screen name="Home">
          {() => (
            <ScreenErrorBoundary name="HomeScreen">
              <HomeScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Profile">
          {() => (
            <ScreenErrorBoundary name="ProfileScreen">
              <ProfileScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="WalletManagement">
          {() => (
            <ScreenErrorBoundary name="WalletManagementScreen">
              <WalletManagementScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Marketplace">
          {() => (
            <ScreenErrorBoundary name="MarketplaceScreen">
              <MarketplaceScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="NFTDetail">
          {() => (
            <ScreenErrorBoundary name="NFTDetailScreen">
              <NFTDetailScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>

        {/* Creator Screens */}
        <Stack.Screen name="CreatorDashboard">
          {() => (
            <ScreenErrorBoundary name="CreatorDashboardScreen">
              <CreatorDashboardScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="MyNFTs">
          {() => (
            <ScreenErrorBoundary name="MyNFTsScreen">
              <MyNFTsScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="MintNFT">
          {() => (
            <ScreenErrorBoundary name="MintNFTScreen">
              <MintNFTScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="CreateCollection">
          {() => (
            <ScreenErrorBoundary name="CreateCollectionScreen">
              <CreateCollectionScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Earnings">
          {() => (
            <ScreenErrorBoundary name="EarningsScreen">
              <EarningsScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>

        {/* Notification Screens */}
        <Stack.Screen name="Notifications">
          {() => (
            <ScreenErrorBoundary name="NotificationsScreen">
              <NotificationsScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="NotificationSettings">
          {() => (
            <ScreenErrorBoundary name="NotificationSettingsScreen">
              <NotificationSettingsScreen />
            </ScreenErrorBoundary>
          )}
        </Stack.Screen>
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