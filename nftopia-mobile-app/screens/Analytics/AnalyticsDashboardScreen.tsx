import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { analyticsService } from '@/src/analytics/analytics.service';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color: string;
}

export default function AnalyticsDashboardScreen() {
  const { t } = useTranslation();
  const { track, trackScreenView } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<MetricCard[]>([
    { title: 'Total Users', value: 1243, change: 12.5, icon: '👥', color: '#6C5CE7' },
    { title: 'NFT Views', value: '12.4K', change: 8.2, icon: '👁️', color: '#00B894' },
    { title: 'Mints', value: 342, change: -2.3, icon: '🎨', color: '#FDCB6E' },
    { title: 'Sales', value: '94', change: 15.7, icon: '💰', color: '#E17055' },
  ]);

  useEffect(() => {
    trackScreenView('AnalyticsDashboard');
    track('analytics_dashboard_view');
  }, [track, trackScreenView]);

  const onRefresh = async () => {
    setLoading(true);
    track('analytics_dashboard_refresh');
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const renderMetricCard = (metric: MetricCard) => (
    <View key={metric.title} style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: metric.color + '20' }]}>
        <Text style={styles.metricIconText}>{metric.icon}</Text>
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{metric.title}</Text>
        <Text style={styles.metricValue}>{metric.value}</Text>
        {metric.change !== undefined && (
          <View style={styles.metricChange}>
            <Text style={[
              styles.metricChangeText,
              { color: metric.change >= 0 ? '#00B894' : '#E17055' }
            ]}>
              {metric.change >= 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        <Text style={styles.subtitle}>Overview of your app performance</Text>
      </View>

      <View style={styles.metricsGrid}>
        {metrics.map(renderMetricCard)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Events</Text>
        <View style={styles.eventList}>
          {[
            { event: 'NFT View', count: 342, time: '2 min ago' },
            { event: 'Login Success', count: 12, time: '5 min ago' },
            { event: 'NFT Mint', count: 3, time: '15 min ago' },
            { event: 'Bid Placed', count: 7, time: '1 hour ago' },
          ].map((event, index) => (
            <View key={index} style={styles.eventItem}>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.event}</Text>
                <Text style={styles.eventTime}>{event.time}</Text>
              </View>
              <Text style={styles.eventCount}>{event.count}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.performanceCard}>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>App Load Time</Text>
            <Text style={styles.performanceValue}>1.2s</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>API Response Time</Text>
            <Text style={styles.performanceValue}>342ms</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Image Load Time</Text>
            <Text style={styles.performanceValue}>567ms</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Crash Rate</Text>
            <Text style={styles.performanceValue}>0.23%</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => track('analytics_export_data')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Export Data</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => track('analytics_view_funnels')}
          >
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionLabel}>View Funnels</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => track('analytics_view_errors')}
          >
            <Text style={styles.actionIcon}>⚠️</Text>
            <Text style={styles.actionLabel}>Error Logs</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Session ID: {analyticsService.getSessionId()}
        </Text>
        <Text style={styles.footerText}>
          Analytics Status: {analyticsService.isEnabled() ? '✅ Enabled' : '❌ Disabled'}
        </Text>
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
    marginTop: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  metricIconText: {
    fontSize: 20,
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  metricChange: {
    marginTop: 2,
  },
  metricChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  eventList: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  eventTime: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  eventCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  performanceCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  performanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 2,
  },
});