import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useDeepLink } from '@/src/hooks/useDeepLink';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function DeepLinkTestScreen() {
  const { processDeepLink, buildShareLink } = useDeepLink();
  const [url, setUrl] = useState('nftopia:///nft/123');
  const [result, setResult] = useState('');

  const testLinks = [
    { label: 'NFT Detail', url: 'nftopia:///nft/123' },
    { label: 'Collection', url: 'nftopia:///collection/456' },
    { label: 'Profile', url: 'nftopia:///profile/user123' },
    { label: 'Marketplace', url: 'nftopia:///marketplace' },
    { label: 'Notifications', url: 'nftopia:///notifications' },
    { label: 'Auction', url: 'nftopia:///auction/789' },
    { label: 'Creator', url: 'nftopia:///creator/creator456' },
    { label: 'Wallet', url: 'nftopia:///wallet' },
    { label: 'Login', url: 'nftopia:///auth/login' },
    { label: 'Register', url: 'nftopia:///auth/register' },
    { label: 'Onboarding', url: 'nftopia:///onboarding' },
  ];

  const handleTest = async () => {
    try {
      setResult(`Processing: ${url}`);
      await processDeepLink(url);
      setResult(`✅ Success: ${url}`);
    } catch (error) {
      setResult(`❌ Error: ${(error as Error).message}`);
    }
  };

  const handleBuildShareLink = () => {
    const link = buildShareLink('/nft/123', { ref: 'share' });
    setResult(`Share link: ${link}`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Deep Link Tester</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enter URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="Enter deep link URL"
        />
        <TouchableOpacity style={styles.button} onPress={handleTest}>
          <Text style={styles.buttonText}>Process Deep Link</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Links</Text>
        <View style={styles.linkGrid}>
          {testLinks.map((link, index) => (
            <TouchableOpacity
              key={index}
              style={styles.linkButton}
              onPress={() => {
                setUrl(link.url);
                processDeepLink(link.url);
              }}
            >
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>
                {link.url}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Build Share Link</Text>
        <TouchableOpacity style={styles.button} onPress={handleBuildShareLink}>
          <Text style={styles.buttonText}>Build Share Link</Text>
        </TouchableOpacity>
      </View>

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Result:</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    marginTop: 60,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkGrid: {
    gap: spacing.sm,
  },
  linkButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  resultContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  resultText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});