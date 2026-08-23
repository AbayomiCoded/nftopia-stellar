import { NativeStackScreenProps, createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import WalletSelectionScreen from '../screens/Auth/WalletSelectionScreen';
import WalletCreateScreen from '../screens/Auth/WalletCreateScreen';
import WalletImportScreen from '../screens/Auth/WalletImportScreen';
import EmailLoginScreen from '../screens/Auth/EmailLoginScreen';
import EmailRegisterScreen from '../screens/Auth/EmailRegisterScreen';
import { getTransitionConfig } from '@/src/navigation/transition.config';

export type AuthStackParamList = {
  Onboarding: undefined;
  WalletSelection: undefined;
  WalletCreate: undefined;
  WalletImport: undefined;
  EmailLogin: undefined;
  EmailRegister: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = 
  NativeStackScreenProps<AuthStackParamList, T>;

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerShown: false,
        ...getTransitionConfig('auth'),
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen}
        options={{
          title: 'Welcome',
          ...getTransitionConfig('auth'),
        }}
      />
      <Stack.Screen 
        name="WalletSelection" 
        component={WalletSelectionScreen}
        options={{
          title: 'Select Wallet',
          ...getTransitionConfig('auth'),
        }}
      />
      <Stack.Screen 
        name="WalletCreate" 
        component={WalletCreateScreen}
        options={{
          title: 'Create Wallet',
          ...getTransitionConfig('auth'),
        }}
      />
      <Stack.Screen 
        name="WalletImport" 
        component={WalletImportScreen}
        options={{
          title: 'Import Wallet',
          ...getTransitionConfig('auth'),
        }}
      />
      <Stack.Screen 
        name="EmailLogin" 
        component={EmailLoginScreen}
        options={{
          title: 'Sign In',
          ...getTransitionConfig('auth'),
        }}
      />
      <Stack.Screen 
        name="EmailRegister" 
        component={EmailRegisterScreen}
        options={{
          title: 'Sign Up',
          ...getTransitionConfig('auth'),
        }}
      />
    </Stack.Navigator>
  );
}