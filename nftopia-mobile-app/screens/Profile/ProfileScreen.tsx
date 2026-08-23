import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/src/stores/languageStore';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';
import { LanguageSwitcher } from '@/src/components/LanguageSwitcher';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { withErrorBoundary } from '@/src/hoc/withErrorBoundary';
import { errorLogger } from '@/src/errors/logger';
import { useTheme } from '@/src/theme/ThemeContext';

type Props = NativeStackScreenProps<MainStackParamList, 'Profile'>;

function ProfileContent({ navigation }: Props) {
  const { t } = useTranslation();
  const { activeWallet, network, switchNetwork, wallets } = useWalletConnect();
  const { user, logout } = useAuthStore();
  const { language } = useLanguageStore();
  const { colors, isDark } = useTheme();

  const handleSignOut = () => {
    Alert.alert(
      t('profile.signOut'),
      t('profile.signOutConfirm'),
      [
        { text: t('profile.signOutCancel'), style: 'cancel' },
        { 
          text: t('profile.signOutConfirmButton'), 
          style: 'destructive',
          onPress: () => {
            logout();
            errorLogger.log(
              new Error('User signed out'),
              'ProfileScreen',
              user?.id,
              { action: 'sign_out' }
            );
          }
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingTop: 60,
      gap: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      padding: 16,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLabel: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    rowValue: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
    },
    rowValueMono: {
      fontSize: 13,
      fontFamily: 'monospace',
      color: colors.text,
      maxWidth: 180,
    },
    noWalletText: {
      fontSize: 15,
      color: colors.textTertiary,
      marginBottom: 8,
    },
    linkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      marginTop: 4,
    },
    linkText: {
      fontSize: 15,
      color: colors.info,
      fontWeight: '500',
    },
    arrow: {
      fontSize: 18,
      color: colors.textTertiary,
    },
    logoutButton: {
      backgroundColor: colors.errorBackground,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.error,
    },
    themeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.account')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('profile.email')}</Text>
          <Text style={styles.rowValue}>{user?.email ?? t('common.noResults')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.wallet')}</Text>
        {activeWallet ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('profile.activeWallet')}</Text>
            <Text style={styles.rowValueMono} numberOfLines={1}>
              {activeWallet.publicKey.slice(0, 12)}...{activeWallet.publicKey.slice(-8)}
            </Text>
          </View>
        ) : (
          <Text style={styles.noWalletText}>{t('profile.noWalletConnected')}</Text>
        )}
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('WalletManagement')}
        >
          <Text style={styles.linkText}>
            {t('profile.manageWallets', { count: wallets.length })}
          </Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.settings')}</Text>
        <View style={styles.themeRow}>
          <Text style={styles.rowLabel}>{t('profile.theme')}</Text>
          <ThemeToggle variant="switch" showLabel={false} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.language')}</Text>
        <LanguageSwitcher variant="full" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.network')}</Text>
        <NetworkSwitcher network={network} onSwitch={switchNetwork} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const ProfileScreen = withErrorBoundary(ProfileContent, {
  name: 'ProfileScreen',
  onError: (error, errorInfo) => {
    errorLogger.log(
      error,
      'ProfileScreen',
      undefined,
      { componentStack: errorInfo.componentStack }
    );
  },
});

export default ProfileScreen;