import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { configManager, config, getEnvironment, isProduction, reloadConfig } from '@/src/config';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

export default function ConfigDebugScreen() {
  const [loading, setLoading] = useState(false);
  const [configData, setConfigData] = useState<any>(null);
  const [secureValues, setSecureValues] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const configObj = configManager.getConfig();
      setConfigData(configManager.toJSON());
      
      // Load secure values
      const encryptionKey = await configManager.getSecureValue('config_encryption_key');
      const apiToken = await configManager.getSecureValue('config_api_token');
      setSecureValues({
        encryptionKey: encryptionKey || 'Not set',
        apiToken: apiToken ? '***' : 'Not set',
      });
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReload = () => {
    reloadConfig();
    loadData();
    Alert.alert('Config Reloaded', 'Configuration has been reloaded successfully.');
  };

  const handleSetSecureValue = async () => {
    Alert.alert(
      'Set Secure Value',
      'Enter encryption key',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set',
          onPress: async () => {
            await configManager.setSecureValue('config_encryption_key', 'custom-key-123');
            loadData();
            Alert.alert('Success', 'Encryption key set successfully.');
          },
        },
      ]
    );
  };

  const handleClearSecureValue = async () => {
    Alert.alert(
      'Clear Secure Value',
      'Are you sure you want to clear the encryption key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await configManager.removeSecureValue('config_encryption_key');
            loadData();
            Alert.alert('Success', 'Encryption key cleared.');
          },
        },
      ]
    );
  };

  const renderConfigSection = (title: string, data: any, level: number = 0) => {
    if (typeof data !== 'object' || data === null) {
      return (
        <View key={title} style={[styles.configRow, { paddingLeft: level * 16 }]}>
          <Text style={styles.configKey}>{title}:</Text>
          <Text style={styles.configValue}>{String(data)}</Text>
        </View>
      );
    }

    return (
      <View key={title} style={[styles.configSection, { paddingLeft: level * 8 }]}>
        <Text style={styles.configSectionTitle}>{title}</Text>
        {Object.entries(data).map(([key, value]) =>
          renderConfigSection(key, value, level + 1)
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadData} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Config Debug</Text>
        <Text style={styles.subtitle}>Environment: {getEnvironment()}</Text>
        <Text style={[styles.subtitle, { color: isProduction() ? colors.success : colors.warning }]}>
          Mode: {isProduction() ? 'Production' : 'Development'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
          <Text style={styles.reloadButtonText}>Reload Config</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secureButton} onPress={handleSetSecureValue}>
          <Text style={styles.secureButtonText}>Set Secure Key</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearSecureValue}>
          <Text style={styles.clearButtonText}>Clear Secure Key</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.secureSection}>
        <Text style={styles.sectionTitle}>Secure Values</Text>
        <View style={styles.secureRow}>
          <Text style={styles.secureKey}>Encryption Key:</Text>
          <Text style={styles.secureValue}>{secureValues.encryptionKey}</Text>
        </View>
        <View style={styles.secureRow}>
          <Text style={styles.secureKey}>API Token:</Text>
          <Text style={styles.secureValue}>{secureValues.apiToken}</Text>
        </View>
      </View>

      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        {configData && renderConfigSection('Config', configData)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  reloadButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secureButton: {
    flex: 1,
    backgroundColor: colors.info,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  secureButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  configSection: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  configKey: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  configValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  configSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  secureSection: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  secureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  secureKey: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  secureValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  shadows: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});