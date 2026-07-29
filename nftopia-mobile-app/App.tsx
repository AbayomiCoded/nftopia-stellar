import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { ApolloProvider, ApolloClient, NormalizedCacheObject } from '@apollo/client';
import AppNavigator from './navigation/AppNavigator';
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <AppNavigator />
      </SafeAreaView>
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
