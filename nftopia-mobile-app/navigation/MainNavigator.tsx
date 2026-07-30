import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import HomeScreen from '@/screens/Home/HomeScreen';
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import WalletManagementScreen from '@/screens/Profile/WalletManagementScreen';
import MarketplaceScreen from '@/screens/Marketplace/MarketplaceScreen';
import NFTDetailScreen from '@/screens/Marketplace/NFTDetailScreen';

export type MainStackParamList = {
  Home: undefined;
  WalletManagement: undefined;
  Profile: undefined;
  Marketplace: undefined;
  NFTDetail: { nftId: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="WalletManagement" component={WalletManagementScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="NFTDetail" component={NFTDetailScreen} />
    </Stack.Navigator>
  );
}
