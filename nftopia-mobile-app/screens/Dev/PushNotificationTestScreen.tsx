import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { usePushNotifications, useScheduledNotifications } from '@/src/hooks/usePushNotifications';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function PushNotificationTestScreen() {
  const {
    pushToken,
    isRegistered,
    scheduleNotification,
    scheduleAuctionNotification,
    cancelNotification,
    retryRegistration,
    resetBadgeCount,
  } = usePushNotifications();

  const { scheduled, fetchScheduled, cancelAll } = useScheduledNotifications();

  const [title, setTitle] = useState('Test Notification');
  const [message, setMessage] = useState('This is a test push notification');
  const [auctionId, setAuctionId] = useState('auction_123');
  const [auctionName, setAuctionName] = useState('Test Auction');
  const [minutesBefore, setMinutesBefore] = useState('15');
  const [scheduleTime, setScheduleTime] = useState('');

  const handleSendTestNotification = async () => {
    if (!pushToken) {
      Alert.alert('Error', 'No push token available');
      return;
    }

    try {
      const notificationId = await scheduleNotification(
        title,
        message,
        { seconds: 5 },
        {
          type: 'test',
          test: true,
        }
      );
      Alert.alert('Success', `Notification scheduled: ${notificationId}`);
      fetchScheduled();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const handleScheduleAuction = async () => {
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + parseInt(minutesBefore) + 1);

    try {
      const notificationId = await scheduleAuctionNotification(
        auctionId,
        auctionName,
        endTime,
        parseInt(minutesBefore)
      );
      Alert.alert('Success', `Auction notification scheduled: ${notificationId}`);
      fetchScheduled();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Push Notification Test</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Push Token:</Text>
          <Text style={styles.statusValue} numberOfLines={1}>
            {pushToken || 'Not available'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Registered:</Text>
          <Text style={[styles.statusValue, isRegistered ? styles.success : styles.error]}>
            {isRegistered ? '✅ Yes' : '❌ No'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Scheduled:</Text>
          <Text style={styles.statusValue}>{scheduled.length}</Text>
        </View>
        <TouchableOpacity style={styles.smallButton} onPress={retryRegistration}>
          <Text style={styles.smallButtonText}>Retry Registration</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton} onPress={resetBadgeCount}>
          <Text style={styles.smallButtonText}>Reset Badge</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send Test Notification</Text>
        <TextInput
          style={styles.input}
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Message"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={handleSendTestNotification}>
          <Text style={styles.buttonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Schedule Auction Notification</Text>
        <TextInput
          style={styles.input}
          placeholder="Auction ID"
          value={auctionId}
          onChangeText={setAuctionId}
        />
        <TextInput
          style={styles.input}
          placeholder="Auction Name"
          value={auctionName}
          onChangeText={setAuctionName}
        />
        <TextInput
          style={styles.input}
          placeholder="Minutes Before"
          value={minutesBefore}
          onChangeText={setMinutesBefore}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.button} onPress={handleScheduleAuction}>
          <Text style={styles.buttonText}>Schedule Auction</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Scheduled Notifications ({scheduled.length})</Text>
        {scheduled.map((item, index) => (
          <View key={index} style={styles.scheduledItem}>
            <Text style={styles.scheduledTitle}>{item.content.title}</Text>
            <Text style={styles.scheduledBody}>{item.content.body}</Text>
            <Text style={styles.scheduledTrigger}>
              Trigger: {JSON.stringify(item.trigger).substring(0, 50)}
            </Text>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => {
                cancelNotification(item.identifier);
                fetchScheduled();
              }}
            >
              <Text style={styles.smallButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ))}
        {scheduled.length > 0 && (
          <TouchableOpacity style={styles.dangerButton} onPress={cancelAll}>
            <Text style={styles.dangerButtonText}>Cancel All</Text>
          </TouchableOpacity>
        )}
      </View>
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
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  success: {
    color: '#00B894',
  },
  error: {
    color: '#E17055',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  smallButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scheduledItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  scheduledTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  scheduledBody: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scheduledTrigger: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
  },
  shadows: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});