import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { ApolloProvider, ApolloClient, NormalizedCacheObject } from '@apollo/client';
import AppNavigator from './navigation/AppNavigator';
import AppLayout from './app/_layout';
import ToastProvider from './components/Toast';
import { ConnectivityBanner } from './src/components/ConnectivityBanner';
import { NetworkStatusManager } from './src/components/NetworkStatusManager';
import { SessionManager } from './src/components/SessionManager';
import { AppLockManager } from './src/components/AppLockManager';
import { PrivacyOverlay } from './src/components/PrivacyOverlay';
import { setupApollo } from './lib/api/apolloClient';

export default function App() {
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject> | undefined>();

  useEffect(() => {
    setupApollo().then(setClient).catch(console.error);
  }, []);

  if (!client) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ApolloProvider client={client}>
      <AppLayout>
        <PrivacyOverlay />
        <AppLockManager>
          <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <NetworkStatusManager />
            <SessionManager />
            <ConnectivityBanner />
            <AppNavigator />
            <ToastProvider />
          </SafeAreaView>
        </AppLockManager>
      </AppLayout>
    </ApolloProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});