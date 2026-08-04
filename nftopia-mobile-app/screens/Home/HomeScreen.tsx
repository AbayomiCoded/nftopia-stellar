import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/MainNavigator';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { useWalletStore } from '@/stores/walletStore';
import { useAuthStore } from '@/stores/authStore';
import BalanceDisplay from '@/components/wallet/BalanceDisplay';
import { withErrorBoundary } from '@/src/hoc/withErrorBoundary';
import { errorLogger } from '@/src/errors/logger';
import { ErrorFallback } from '@/src/components/ErrorFallback';
import { HomeSkeleton } from '@/src/components/skeletons';
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh';
import { PullToRefresh } from '@/src/components/PullToRefresh';

function HomeContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuthStore();
  const {
    activeWallet,
    activePublicKey,
    activeBalance,
    isLoading,
    error,
    fetchBalances,
  } = useWalletConnect();
  const network = useWalletStore((s) => s.network);

  const {
    isRefreshing,
    error: refreshError,
    lastUpdated,
    handleRefresh,
    getLastUpdatedText,
    cooldownRemaining,
  } = usePullToRefresh({
    onRefresh: async () => {
      if (activePublicKey) {
        await fetchBalances(activePublicKey);
      }
    },
    cooldown: 2000,
    hapticFeedback: true,
    trackAnalytics: true,
    analyticsEvent: 'home_refresh',
  });

  useEffect(() => {
    if (activePublicKey) {
      fetchBalances(activePublicKey);
    }
  }, [activePublicKey, fetchBalances]);

  // Show skeleton while loading
  if (isLoading && !activeWallet) {
    return <HomeSkeleton />;
  }

  if (!activeWallet) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t('home.noWallet')}</Text>
        <Text style={styles.emptySubtitle}>{t('home.noWalletSubtitle')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ErrorFallback
        error={error ? new Error(error) : null}
        onRetry={handleRefresh}
        customMessage="Failed to load wallet data. Please try again."
      />
    );
  }

  const greetingName = user?.email?.split('@')[0] || t('home.greetingDefault');

  return (
    <PullToRefresh
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      loading={isLoading}
      error={refreshError}
      onRetry={handleRefresh}
      lastUpdated={lastUpdated}
      getLastUpdatedText={getLastUpdatedText}
      cooldownRemaining={cooldownRemaining}
      tintColor="#6C5CE7"
      title="Pull to refresh wallet"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('home.greeting', { name: greetingName })}</Text>
            <Text style={styles.subGreeting}>{t('home.title')}</Text>
          </View>
          <View style={styles.networkBadge}>
            <Text style={styles.networkBadgeText}>
              {network === 'testnet' ? t('home.testnet') : t('home.mainnet')}
            </Text>
          </View>
        </View>

        <BalanceDisplay
          xlmBalance={activeBalance?.xlm ?? null}
          tokenBalances={activeBalance?.tokens ?? []}
          isLoading={isLoading}
          error={error}
          onRefresh={handleRefresh}
          publicKey={activePublicKey ?? undefined}
        />

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.actionIcon}>🛍️</Text>
            <Text style={styles.actionLabel}>{t('home.actions.marketplace')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionLabel}>{t('home.actions.send')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📥</Text>
            <Text style={styles.actionLabel}>{t('home.actions.receive')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionLabel}>{t('home.actions.swap')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </PullToRefresh>
  );
}

const HomeScreen = withErrorBoundary(HomeContent, {
  name: 'HomeScreen',
  onError: (error, errorInfo) => {
    errorLogger.log(
      error,
      'HomeScreen',
      undefined,
      { componentStack: errorInfo.componentStack }
    );
  },
});

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subGreeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  networkBadge: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  networkBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});