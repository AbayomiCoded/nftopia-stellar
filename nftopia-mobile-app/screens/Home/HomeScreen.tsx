import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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

  const onRefresh = useCallback(() => {
    if (activePublicKey) {
      fetchBalances(activePublicKey);
    }
  }, [activePublicKey, fetchBalances]);

  useEffect(() => {
    if (activePublicKey) {
      fetchBalances(activePublicKey);
    }
  }, [activePublicKey, fetchBalances]);

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
        onRetry={onRefresh}
        customMessage="Failed to load wallet data. Please try again."
      />
    );
  }

  const greetingName = user?.email?.split('@')[0] || t('home.greetingDefault');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
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
        onRefresh={onRefresh}
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