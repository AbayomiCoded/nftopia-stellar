import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useToast } from '@/src/hooks/useToast';
import { colors, spacing, borderRadius } from '@/constants/theme';

export function ToastExample() {
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showToast,
    showAlert,
  } = useToast();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Toast Notifications</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Toasts</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={() => showSuccess('Operation completed successfully!')}
          >
            <Text style={styles.buttonText}>Success</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.errorButton]}
            onPress={() => showError('Something went wrong. Please try again.')}
          >
            <Text style={styles.buttonText}>Error</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={() => showWarning('Please review your input before submitting.')}
          >
            <Text style={styles.buttonText}>Warning</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.infoButton]}
            onPress={() => showInfo('New update available. Tap to install.')}
          >
            <Text style={styles.buttonText}>Info</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Duration</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={() => showSuccess('Short toast (1s)', 1000)}
          >
            <Text style={styles.buttonText}>1 Second</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={() => showSuccess('Long toast (5s)', 5000)}
          >
            <Text style={styles.buttonText}>5 Seconds</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>With Action</Text>
        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={() =>
            showToast(
              'New version available!',
              'info',
              5000,
              'top',
              {
                label: 'Update',
                onPress: () => showSuccess('Update started!'),
              }
            )
          }
        >
          <Text style={styles.buttonText}>Toast with Action</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alerts</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={() =>
              showAlert(
                'Confirm Action',
                'Are you sure you want to proceed with this action?',
                [
                  {
                    label: 'Cancel',
                    style: 'cancel',
                    onPress: () => showInfo('Action cancelled'),
                  },
                  {
                    label: 'Confirm',
                    onPress: () => showSuccess('Action confirmed!'),
                  },
                ],
                'info'
              )
            }
          >
            <Text style={styles.buttonText}>Confirm Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.errorButton]}
            onPress={() =>
              showAlert(
                'Delete Item',
                'This action cannot be undone. Are you sure?',
                [
                  {
                    label: 'Cancel',
                    style: 'cancel',
                    onPress: () => showInfo('Deletion cancelled'),
                  },
                  {
                    label: 'Delete',
                    style: 'destructive',
                    onPress: () => showSuccess('Item deleted!'),
                  },
                ],
                'error'
              )
            }
          >
            <Text style={styles.buttonText}>Delete Alert</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Position</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.infoButton]}
            onPress={() => showToast('Top position', 'info', 2000, 'top')}
          >
            <Text style={styles.buttonText}>Top</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.infoButton]}
            onPress={() => showToast('Center position', 'info', 2000, 'center')}
          >
            <Text style={styles.buttonText}>Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.infoButton]}
            onPress={() => showToast('Bottom position', 'info', 2000, 'bottom')}
          >
            <Text style={styles.buttonText}>Bottom</Text>
          </TouchableOpacity>
        </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  button: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  successButton: {
    backgroundColor: colors.success,
  },
  errorButton: {
    backgroundColor: colors.error,
  },
  warningButton: {
    backgroundColor: colors.warning,
  },
  infoButton: {
    backgroundColor: colors.info,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});