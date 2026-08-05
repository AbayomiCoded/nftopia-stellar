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
import { performanceService } from '@/src/services/performance.service';
import { errorTrackingService } from '@/src/services/errorTracking.service';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: string;
  color: string;
}

function MetricCard({ title, value, subValue, icon, color }: MetricCardProps) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {subValue && <Text style={styles.metricSubValue}>{subValue}</Text>}
    </View>
  );
}

export default function PerformanceDashboardScreen() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const reportData = performanceService.generateReport();
      setReport(reportData);

      const allMetrics = performanceService.getMetrics();
      setMetrics(allMetrics.slice(-20)); // Last 20 metrics

      setSessionId(errorTrackingService.getSessionId() || '');
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getMemoryUsage = (): string => {
    const memory = metrics.find(m => m.name === 'memory_usage');
    if (memory) return `${Math.round(memory.value)}%`;
    return 'N/A';
  };

  const getFrameDrops = (): string => {
    const drops = metrics.filter(m => m.name === 'frame_drop');
    return String(drops.length);
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
        <Text style={styles.title}>Performance Dashboard</Text>
        <Text style={styles.subtitle}>Real-time performance metrics</Text>
      </View>

      <View style={styles.sessionCard}>
        <Text style={styles.sessionLabel}>Session ID</Text>
        <Text style={styles.sessionValue}>{sessionId || 'N/A'}</Text>
        <Text style={styles.sessionLabel}>Platform</Text>
        <Text style={styles.sessionValue}>React Native / Mobile</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Total Metrics"
          value={report?.totalMetrics || 0}
          icon="📊"
          color={colors.info}
        />
        <MetricCard
          title="Avg Screen Load"
          value={report?.screenLoads?.average ? formatTime(report.screenLoads.average) : 'N/A'}
          icon="📱"
          color={colors.success}
        />
        <MetricCard
          title="Avg API Call"
          value={report?.apiCalls?.average ? formatTime(report.apiCalls.average) : 'N/A'}
          icon="🌐"
          color={colors.primary}
        />
        <MetricCard
          title="Memory Usage"
          value={getMemoryUsage()}
          icon="💾"
          color={colors.warning}
        />
        <MetricCard
          title="Frame Drops"
          value={getFrameDrops()}
          icon="🎬"
          color={report?.frameDrops > 10 ? colors.error : colors.success}
        />
        <MetricCard
          title="Slow Calls"
          value={report?.slowCalls || 0}
          icon="🐢"
          color={report?.slowCalls > 5 ? colors.error : colors.warning}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Metrics</Text>
        {metrics.length === 0 ? (
          <Text style={styles.emptyText}>No metrics recorded yet</Text>
        ) : (
          metrics.map((metric, index) => (
            <View key={index} style={styles.metricRow}>
              <Text style={styles.metricName}>{metric.name}</Text>
              <Text style={styles.metricValueText}>
                {metric.value} {metric.unit}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.exportButton} onPress={loadData}>
          <Text style={styles.exportButtonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            performanceService.clearMetrics();
            loadData();
          }}
        >
          <Text style={styles.clearButtonText}>Clear Metrics</Text>
        </TouchableOpacity>
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
  sessionCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sessionLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  sessionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  metricSubValue: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
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
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricName: {
    fontSize: 13,
    color: colors.text,
  },
  metricValueText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exportButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.errorBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.error,
    fontWeight: '600',
  },
  shadows: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});