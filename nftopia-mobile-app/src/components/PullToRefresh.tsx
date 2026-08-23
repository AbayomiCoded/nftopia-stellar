import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

export interface PullToRefreshProps {
  children: ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  lastUpdated?: Date | null;
  getLastUpdatedText?: () => string;
  cooldownRemaining?: number;
  tintColor?: string;
  titleColor?: string;
  title?: string;
  scrollViewRef?: React.RefObject<ScrollView>;
}

export function PullToRefresh({
  children,
  refreshing,
  onRefresh,
  loading = false,
  error = null,
  onRetry,
  lastUpdated = null,
  getLastUpdatedText = () => 'Never updated',
  cooldownRemaining = 0,
  tintColor = '#6C5CE7',
  titleColor = colors.textSecondary,
  title = 'Pull to refresh',
  scrollViewRef,
}: PullToRefreshProps) {
  const renderRefreshControl = () => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      colors={[tintColor]}
      progressBackgroundColor={colors.background}
      title={title}
      titleColor={titleColor}
    />
  );

  const renderFooter = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={tintColor} />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    return null;
  };

  const renderHeader = () => {
    if (refreshing) return null;
    
    return (
      <View style={styles.headerContainer}>
        {error && onRetry && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error.message}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {!error && lastUpdated && (
          <View style={styles.lastUpdatedContainer}>
            <Text style={styles.lastUpdatedText}>
              Last updated: {getLastUpdatedText()}
            </Text>
            {cooldownRemaining > 0 && (
              <Text style={styles.cooldownText}>
                ⏳ {cooldownRemaining}s
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // For FlatList
  if (React.isValidElement(children) && children.type === FlatList) {
    const flatListProps = children.props as any;
    return React.cloneElement(children as React.ReactElement<any>, {
      refreshControl: renderRefreshControl(),
      ListHeaderComponent: (
        <>
          {flatListProps.ListHeaderComponent}
          {renderHeader()}
        </>
      ),
      ListFooterComponent: (
        <>
          {renderFooter()}
          {flatListProps.ListFooterComponent}
        </>
      ),
    });
  }

  // For ScrollView
  if (React.isValidElement(children) && children.type === ScrollView) {
    const scrollViewProps = children.props as any;
    return React.cloneElement(children as React.ReactElement<any>, {
      refreshControl: renderRefreshControl(),
      ref: scrollViewRef,
      children: (
        <>
          {renderHeader()}
          {scrollViewProps.children}
          {renderFooter()}
        </>
      ),
    });
  }

  // For custom components
  return (
    <ScrollView
      refreshControl={renderRefreshControl()}
      contentContainerStyle={styles.scrollContent}
      ref={scrollViewRef}
    >
      {renderHeader()}
      {children}
      {renderFooter()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  headerContainer: {
    paddingHorizontal: spacing.md,
  },
  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  errorIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    marginRight: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  cooldownText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});