import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import apiClient from '@/lib/api/sample';

interface SettingRowProps {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function SettingRow({ label, description, value, onValueChange }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: '#6C5CE7' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function NotificationSettingsScreen({ navigation }: any) {
  const { preferences, updatePreferences, fetchPreferences } = useNotificationStore();

  useEffect(() => {
    fetchPreferences();
    apiClient.trackEvent('notification_settings_view', { timestamp: new Date().toISOString() });
  }, []);

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    updatePreferences({ [key]: value });
    apiClient.trackEvent('notification_setting_toggle', { setting: key, value });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <SettingRow
          label="Push Notifications"
          description="Receive push notifications for all events"
          value={preferences.pushEnabled}
          onValueChange={(v) => handleToggle('pushEnabled', v)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketplace</Text>
        <SettingRow
          label="Outbid"
          description="When someone outbids you on an NFT"
          value={preferences.outbid}
          onValueChange={(v) => handleToggle('outbid', v)}
        />
        <SettingRow
          label="Sale"
          description="When one of your NFTs is sold"
          value={preferences.sale}
          onValueChange={(v) => handleToggle('sale', v)}
        />
        <SettingRow
          label="Listing"
          description="When an NFT you're watching is listed"
          value={preferences.listing}
          onValueChange={(v) => handleToggle('listing', v)}
        />
        <SettingRow
          label="Offer"
          description="When you receive an offer on an NFT"
          value={preferences.offer}
          onValueChange={(v) => handleToggle('offer', v)}
        />
        <SettingRow
          label="Auction Ending"
          description="When an auction you're in is about to end"
          value={preferences.auction_end}
          onValueChange={(v) => handleToggle('auction_end', v)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social</Text>
        <SettingRow
          label="Follows"
          description="When someone follows you"
          value={preferences.follow}
          onValueChange={(v) => handleToggle('follow', v)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Creation</Text>
        <SettingRow
          label="Minting"
          description="When your NFT is successfully minted"
          value={preferences.mint}
          onValueChange={(v) => handleToggle('mint', v)}
        />
        <SettingRow
          label="Transfers"
          description="When an NFT is transferred to or from you"
          value={preferences.transfer}
          onValueChange={(v) => handleToggle('transfer', v)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: { fontSize: 16, color: '#6C5CE7', fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: { flex: 1, marginRight: 16 },
  settingLabel: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  settingDescription: { fontSize: 12, color: '#999', marginTop: 2 },
});