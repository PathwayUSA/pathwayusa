import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Alert, Linking, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { rowStyles, SectionHeader, RowToggle } from '../../components/SettingsRow';
import {
  registerForPushNotifications,
  cancelAllDeadlineNotifications,
  cancelEligibilityMilestones,
  cancelWeeklySummary,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../../lib/notifications';

const NOTIF_PREFS_KEY = '@pathwayusa/notif_prefs';

// Inactivity Reminders removed entirely (not just hidden) — guilt-nudging
// users about immigration progress they may not control is a manipulative
// pattern, per the redesign spec's notification-safety rules.
const DEFAULT_NOTIFS = {
  quiz_reminder:        true,
  deadline_alerts:      true,
  doc_expiry:           true,
  eligibility_milestones: true,
  weekly_summary:       false,
  tips_daily:           false,
  news_updates:         false,
};

export default function RemindersSettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { profile, updateProfile } = useAuth();
  const { isPro } = useSubscription();
  const insets = useSafeAreaInsets();

  const [osPermissionGranted, setOsPermissionGranted] = useState(true);
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setOsPermissionGranted(status === 'granted');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile?.notification_preferences) return;
    setNotifs((prev) => ({ ...DEFAULT_NOTIFS, ...prev, ...profile.notification_preferences }));
  }, [profile?.id]);

  // Toggling any reminder on requests the real OS permission at that moment —
  // there's no separate in-app "Notifications On/Off" master switch, since
  // that would just be a fake duplicate of the permission iOS/Android already
  // manage. If permission is denied, we point to the real Settings screen.
  const toggleNotif = async (key) => {
    const turningOn = !notifs[key];
    if (turningOn && !osPermissionGranted) {
      const status = await registerForPushNotifications();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To enable reminders, allow PathwayUSA to send notifications in your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      setOsPermissionGranted(true);
      updateProfile({ notifications_enabled: true }).catch(() => {});
    }

    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next)).catch(() => {});
      updateProfile({ notification_preferences: next }).catch(() => {});
      if (!next[key]) {
        if (key === 'quiz_reminder')          cancelDailyReminder();
        if (key === 'deadline_alerts')        cancelAllDeadlineNotifications();
        if (key === 'eligibility_milestones') cancelEligibilityMilestones();
        if (key === 'weekly_summary')         cancelWeeklySummary();
      } else {
        if (key === 'quiz_reminder') scheduleDailyReminder();
      }
      return next;
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {!osPermissionGranted && (
        <TouchableOpacity style={styles.permBanner} onPress={() => Linking.openSettings()} activeOpacity={0.8}>
          <Ionicons name="notifications-off-outline" size={18} color="#e65100" />
          <Text style={styles.permBannerTxt}>
            Notifications are off in your device Settings. Tap here to turn them on.
          </Text>
        </TouchableOpacity>
      )}

      <View style={rowStyles.section}>
        <SectionHeader
          icon="alert-circle-outline" iconBg="#fff3e0" iconColor="#f57c00"
          title="Essential" subtitle="Time-sensitive — things you could miss"
        />
        <RowToggle icon="calendar-outline" label="Deadline Alerts"        subtitle="30, 7 & 1 day before each deadline"    value={notifs.deadline_alerts}        onValueChange={() => toggleNotif('deadline_alerts')}        iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
        <View style={rowStyles.divider} />
        <RowToggle icon="document-text-outline" label="Document Expiry"  subtitle="When your documents are expiring"      value={notifs.doc_expiry}             onValueChange={() => toggleNotif('doc_expiry')}             iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
        <View style={rowStyles.divider} />
        <RowToggle icon="ribbon-outline"   label="Eligibility Milestones" subtitle="1yr, 6mo & 30d before you're eligible" value={notifs.eligibility_milestones} onValueChange={() => toggleNotif('eligibility_milestones')} iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
      </View>

      <View style={rowStyles.section}>
        <SectionHeader
          icon="bulb-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="Optional" subtitle="Study nudges and updates — nothing time-critical"
        />
        <RowToggle icon="school-outline"    label="Daily Quiz Reminder"    subtitle="Remind me to practice every day"      value={notifs.quiz_reminder} onValueChange={() => toggleNotif('quiz_reminder')} iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
        <View style={rowStyles.divider} />
        <RowToggle icon="bulb-outline"      label="Daily Immigration Tip"  subtitle="One tip each morning"                  value={notifs.tips_daily}    onValueChange={() => toggleNotif('tips_daily')}    iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
        <View style={rowStyles.divider} />
        <RowToggle icon="newspaper-outline" label="USCIS News Updates"     subtitle="Important policy changes"              value={notifs.news_updates}  onValueChange={() => toggleNotif('news_updates')}  iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
        <View style={rowStyles.divider} />
        {isPro ? (
          <RowToggle icon="bar-chart-outline" label="Weekly Progress Summary" subtitle="Every Sunday — your journey stats" value={notifs.weekly_summary} onValueChange={() => toggleNotif('weekly_summary')} iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
        ) : (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, minHeight: 56, opacity: 0.55 }}
            onPress={() => navigation.navigate('Upgrade')}
            activeOpacity={0.75}
          >
            <Ionicons name="bar-chart-outline" size={20} color="#0F2A3D" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#111' }}>Weekly Progress Summary</Text>
              <Text style={{ fontSize: 14, color: '#888', marginTop: 2 }}>Pro feature — upgrade to unlock</Text>
            </View>
            <View style={{ backgroundColor: '#0F2A3D18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#0F2A3D' }}>PRO</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  permBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff3e0', borderRadius: 14, padding: 14 },
  permBannerTxt: { flex: 1, fontSize: 13, color: '#e65100', fontWeight: '600', lineHeight: 18 },
});
