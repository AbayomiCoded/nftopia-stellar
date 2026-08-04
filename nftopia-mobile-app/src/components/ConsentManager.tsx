import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { analyticsService } from '@/src/analytics/analytics.service';

interface ConsentManagerProps {
  visible: boolean;
  onConsentGiven?: () => void;
  onConsentDenied?: () => void;
}

export function ConsentManager({
  visible,
  onConsentGiven,
  onConsentDenied,
}: ConsentManagerProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const handleAccept = () => {
    setConsentGiven(true);
    analyticsService.setConsent(true);
    if (onConsentGiven) onConsentGiven();
  };

  const handleDecline = () => {
    setConsentGiven(false);
    analyticsService.setConsent(false);
    if (onConsentDenied) onConsentDenied();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.icon}>📊</Text>
            <Text style={styles.title}>Privacy & Analytics</Text>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.description}>
              We use analytics to improve your experience and understand how you use NFTopia.
              This helps us make the app better for everyone.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>What we collect:</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>App usage and interactions</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>Device information and performance</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>Anonymous user behavior</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>Error and crash reports</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.detailsToggleText}>
                {showDetails ? 'Hide details' : 'View details'}
              </Text>
              <Text style={styles.detailsToggleIcon}>
                {showDetails ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {showDetails && (
              <View style={styles.detailsContent}>
                <Text style={styles.detailsText}>
                  We use PostHog to collect anonymous analytics data. Your personal information
                  is never shared with third parties. You can change your consent at any time
                  in the settings.
                </Text>
                <Text style={styles.detailsText}>
                  Data retention: 12 months
                </Text>
                <Text style={styles.detailsText}>
                  Cookie lifetime: {365} days
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    maxWidth: 400,
    width: '100%',
    maxHeight: Dimensions.get('window').height * 0.8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: spacing.lg,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  infoBullet: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailsToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailsToggleText: {
    fontSize: 14,
    color: colors.info,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  detailsToggleIcon: {
    fontSize: 12,
    color: colors.info,
  },
  detailsContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  detailsText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
});