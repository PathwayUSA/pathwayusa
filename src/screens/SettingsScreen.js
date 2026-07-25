import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Switch, Alert, Linking, Share, ToastAndroid, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useVisualEffects } from '../context/VisualEffectsContext';
import { useLanguage, LANGUAGE_OPTIONS } from '../i18n';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../hooks/useSubscription';
import { openBillingPortal } from '../services/stripe';
import { useHelperTips } from '../context/HelperTipsContext';
import { useFirstLaunch } from '../context/FirstLaunchContext';
import { getStateFromZip } from '../lib/zipToState';
import { STATE_DATA } from '../data/stateRepresentatives';
import { ONBOARDING_KEY } from './onboarding/IntakeStack';
import { useOnboardingRefresh } from '../context/OnboardingContext';
import {
  registerForPushNotifications,
  cancelAllUserNotifications,
  cancelAllDeadlineNotifications,
  cancelInactivityReminder,
  cancelEligibilityMilestones,
  cancelWeeklySummary,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../lib/notifications';

const SPEED_OPTIONS = [
  { key: 'slow',   label: 'Slow',   note: '70% speed'  },
  { key: 'normal', label: 'Normal', note: 'Default'     },
  { key: 'fast',   label: 'Fast',   note: '140% speed'  },
];

const NOTIF_PREFS_KEY  = '@pathwayusa/notif_prefs';
const ZIP_KEY          = '@pathwayusa/user_zip_code';
const LOCK_TIMEOUT_KEY = '@pathwayusa/lock_timeout';

const LOCK_OPTIONS = [
  { label: '1 min',  value: 60000 },
  { label: '5 min',  value: 300000 },
  { label: '15 min', value: 900000 },
  { label: 'Never',  value: 0 },
];

const DEFAULT_NOTIFS = {
  quiz_reminder:        true,
  deadline_alerts:      true,
  doc_expiry:           true,
  inactivity_reminders: true,
  eligibility_milestones: true,
  weekly_summary:       false,
  tips_daily:           false,
  news_updates:         false,
};

function SectionHeader({ icon, iconBg, iconColor, title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.sectionMeta}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function RowLink({ icon, label, onPress, iconColor = '#666', value, destructive }) {
  const labelColor = destructive ? '#ef4444' : undefined;
  return (
    <TouchableOpacity style={styles.rowLink} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={destructive ? '#ef4444' : iconColor} />
      <Text style={[styles.rowLinkLabel, labelColor ? { color: labelColor } : {}]}>{label}</Text>
      {!!value && <Text style={styles.rowValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={15} color={destructive ? '#ef4444' : '#bbb'} />
    </TouchableOpacity>
  );
}

function RowToggle({ icon, label, subtitle, value, onValueChange, iconColor = '#666', trackActiveColor }) {
  return (
    <View style={styles.rowToggle}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={styles.rowToggleBody}>
        <Text style={styles.rowToggleLabel}>{label}</Text>
        {!!subtitle && <Text style={styles.rowToggleSub}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e0e0e0', true: (trackActiveColor || '#2196f380') }}
        thumbColor={value ? (trackActiveColor?.replace('80', '') || '#2196f3') : '#bbb'}
        ios_backgroundColor="#e0e0e0"
      />
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { profile, user, updateReadingSpeed, updateProfile, signOut, deleteAccount, refreshProfile } = useAuth();
  const { refresh: refreshOnboarding } = useOnboardingRefresh();
  const { enabled: vfxEnabled, toggle: toggleVfx } = useVisualEffects();
  const { lang, setLang } = useLanguage();
  const insets = useSafeAreaInsets();
  const { plan, isPro, isFree, subscriptionStatus, renewsAt, refresh: refreshSub } = useSubscription();
  const [notifsEnabled, setNotifsEnabled] = useState(false);
  const { tipsEnabled, setTipsEnabled } = useHelperTips();
  const { replay: replayIntro } = useFirstLaunch();

  const [portalLoading, setPortalLoading] = useState(false);
  const currentSpeed = profile?.reading_speed ?? 'normal';
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState(null);
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);
  const [pwSending, setPwSending] = useState(false);
  const [pwSent, setPwSent] = useState(false);
  const [lockTimeout, setLockTimeoutState] = useState(300000);
  const [zipInput, setZipInput] = useState('');
  const [detectedState, setDetectedState] = useState(null);
  const [zipSaved, setZipSaved] = useState(false);

  // One-time device prefs + permission check
  useEffect(() => {
    AsyncStorage.getItem(LOCK_TIMEOUT_KEY).then((v) => {
      if (v != null) setLockTimeoutState(parseInt(v, 10));
    });
    AsyncStorage.getItem(ZIP_KEY).then((z) => {
      if (z) { setZipInput(z); setDetectedState(getStateFromZip(z)); }
    });
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifsEnabled(status === 'granted');
    }).catch(() => {});
  }, []);

  // Merge notification prefs from Supabase profile once it loads
  useEffect(() => {
    if (!profile?.notification_preferences) return;
    setNotifs((prev) => ({ ...DEFAULT_NOTIFS, ...prev, ...profile.notification_preferences }));
  }, [profile?.id]); // re-apply when profile identity changes, not on every render

  const handleLockTimeout = (val) => {
    setLockTimeoutState(val);
    AsyncStorage.setItem(LOCK_TIMEOUT_KEY, String(val)).catch(() => {});
  };

  const handleSaveZip = async () => {
    const digits = zipInput.replace(/\D/g, '').slice(0, 5);
    if (digits.length !== 5) { Alert.alert('Invalid ZIP', 'Please enter a 5-digit ZIP code.'); return; }
    await AsyncStorage.setItem(ZIP_KEY, digits);
    const state = getStateFromZip(digits);
    setDetectedState(state);
    setZipSaved(true);
    setTimeout(() => setZipSaved(false), 2000);
    updateProfile({ zip_code: digits }).catch(() => {});
  };

  const handleSpeedSelect = async (key) => {
    if (key === currentSpeed || saving) return;
    setSaving(true);
    await updateReadingSpeed(key);
    setSaving(false);
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1800);
  };

  const handleMasterNotifToggle = async (value) => {
    if (value) {
      const status = await registerForPushNotifications();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To enable notifications, please allow PathwayUSA to send notifications in your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      setNotifsEnabled(true);
      updateProfile({ notifications_enabled: true }).catch(() => {});
      scheduleDailyReminder();
    } else {
      setNotifsEnabled(false);
      updateProfile({ notifications_enabled: false }).catch(() => {});
      await cancelAllUserNotifications();
    }
  };

  const toggleNotif = (key) => {
    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next)).catch(() => {});
      updateProfile({ notification_preferences: next }).catch(() => {});
      // Cancel / re-schedule the relevant notification type immediately
      if (!next[key]) {
        if (key === 'quiz_reminder')          cancelDailyReminder();
        if (key === 'deadline_alerts')        cancelAllDeadlineNotifications();
        if (key === 'inactivity_reminders')   cancelInactivityReminder();
        if (key === 'eligibility_milestones') cancelEligibilityMilestones();
        if (key === 'weekly_summary')         cancelWeeklySummary();
      } else {
        if (key === 'quiz_reminder') scheduleDailyReminder();
      }
      return next;
    });
  };

  const handleChangePassword = async () => {
    const email = profile?.email || (await supabase.auth.getUser())?.data?.user?.email;
    if (!email) return;
    setPwSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'pathwayusa://reset-password',
    });
    setPwSending(false);
    if (!error) { setPwSent(true); Alert.alert('Check your email', 'A password reset link has been sent.'); }
    else { Alert.alert('Error', error.message); }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await deleteAccount();
          if (error) Alert.alert('Delete Failed', error.message || 'Please try again.');
        }},
      ]
    );
  };

  const handleBillingPortal = async () => {
    setPortalLoading(true);
    try {
      await openBillingPortal();
      await refreshSub();
    } catch (err) {
      Alert.alert('Billing portal unavailable', err.message || 'Please try again.');
    }
    setPortalLoading(false);
  };

  const handleShareApp = () => {
    Share.share({
      message: 'I use PathwayUSA to prepare for my U.S. citizenship test! Download it at pathwayusa.app',
      title: 'PathwayUSA',
    });
  };

  const styleC = (base) => ({ ...base, color: colors.text });
  const s = (c) => [c, { color: colors.text }];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Reading Speed ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="volume-high-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="Reading Speed" subtitle="How fast content is read aloud"
        />
        <View style={styles.speedRow}>
          {SPEED_OPTIONS.map((opt) => {
            const sel = currentSpeed === opt.key;
            const saved = savedKey === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.speedBtn, sel && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => handleSpeedSelect(opt.key)}
                disabled={saving}
              >
                {saving && sel ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : saved ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
                <Text style={[styles.speedLabel, sel && { color: '#fff' }]}>{opt.label}</Text>
                <Text style={[styles.speedNote, { color: sel ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>{opt.note}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Notifications ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="notifications-outline" iconBg="#fff3e0" iconColor="#f57c00"
          title="Notifications" subtitle="PathwayUSA checks in so you never miss a step"
        />
        {/* Master toggle */}
        <RowToggle
          icon={notifsEnabled ? 'notifications' : 'notifications-off-outline'}
          label={notifsEnabled ? 'Notifications On' : 'Notifications Off'}
          subtitle={notifsEnabled ? 'PathwayUSA can send you reminders' : 'Tap to enable push notifications'}
          value={notifsEnabled}
          onValueChange={handleMasterNotifToggle}
          iconColor="#f57c00"
          trackActiveColor="#f57c0080"
        />
        {notifsEnabled && (
          <>
            <View style={styles.divider} />
            <RowToggle icon="school-outline"        label="Daily Quiz Reminder"        subtitle="Remind me to practice every day"         value={notifs.quiz_reminder}          onValueChange={() => toggleNotif('quiz_reminder')}          iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
            <View style={styles.divider} />
            <RowToggle icon="calendar-outline"      label="Deadline Alerts"            subtitle="30, 7 & 1 day before each deadline"      value={notifs.deadline_alerts}        onValueChange={() => toggleNotif('deadline_alerts')}        iconColor="#f57c00"        trackActiveColor="#f57c0080" />
            <View style={styles.divider} />
            <RowToggle icon="flag-outline"          label="Inactivity Reminders"       subtitle="Nudge if no progress for 2 weeks"        value={notifs.inactivity_reminders}   onValueChange={() => toggleNotif('inactivity_reminders')}   iconColor="#E67E22"        trackActiveColor="#E67E2280" />
            <View style={styles.divider} />
            <RowToggle icon="ribbon-outline"        label="Eligibility Milestones"     subtitle="1yr, 6mo & 30d before you're eligible"   value={notifs.eligibility_milestones} onValueChange={() => toggleNotif('eligibility_milestones')} iconColor="#27AE60"        trackActiveColor="#27AE6080" />
            <View style={styles.divider} />
            {isPro ? (
              <RowToggle icon="bar-chart-outline"   label="Weekly Progress Summary"    subtitle="Every Sunday — your journey stats"       value={notifs.weekly_summary}         onValueChange={() => toggleNotif('weekly_summary')}         iconColor="#0F2A3D"        trackActiveColor="#0F2A3D80" />
            ) : (
              <TouchableOpacity
                style={[styles.rowToggle, { opacity: 0.55 }]}
                onPress={() => navigation.navigate('Upgrade')}
                activeOpacity={0.75}
              >
                <Ionicons name="bar-chart-outline" size={20} color="#0F2A3D" />
                <View style={styles.rowToggleBody}>
                  <Text style={styles.rowToggleLabel}>Weekly Progress Summary</Text>
                  <Text style={styles.rowToggleSub}>Pro feature — upgrade to unlock</Text>
                </View>
                <View style={{ backgroundColor: '#0F2A3D18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#0F2A3D' }}>PRO</Text>
                </View>
              </TouchableOpacity>
            )}
            <View style={styles.divider} />
            <RowToggle icon="document-text-outline" label="Document Expiry"            subtitle="When your documents are expiring"        value={notifs.doc_expiry}             onValueChange={() => toggleNotif('doc_expiry')}             iconColor="#ef4444"        trackActiveColor="#ef444480" />
            <View style={styles.divider} />
            <RowToggle icon="bulb-outline"          label="Daily Immigration Tip"      subtitle="One tip each morning"                    value={notifs.tips_daily}             onValueChange={() => toggleNotif('tips_daily')}             iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
            <View style={styles.divider} />
            <RowToggle icon="newspaper-outline"     label="USCIS News Updates"         subtitle="Important policy changes"                value={notifs.news_updates}           onValueChange={() => toggleNotif('news_updates')}           iconColor={colors.primary} trackActiveColor={colors.primary + '80'} />
          </>
        )}
      </View>

      {/* ── Language ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="language-outline" iconBg="#e8f5e9" iconColor="#2e7d32"
          title="App Language"
        />
        <View style={styles.langRow}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = lang === opt.code;
            const flagMap = { en: '🇺🇸', es: '🇲🇽', ht: '🇭🇹', fr: '🇫🇷' };
            return (
              <TouchableOpacity
                key={opt.code}
                style={[styles.langBtn, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => {
                  if (opt.comingSoon) {
                    const langName = opt.code === 'es' ? 'Spanish' : 'French';
                    Alert.alert(
                      'Coming Soon!',
                      `We're working on full ${langName} translations. Some screens may still be in English.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Use Anyway', onPress: () => setLang(opt.code) },
                      ],
                    );
                  } else {
                    setLang(opt.code);
                  }
                }}
              >
                <Text style={styles.langFlag}>{flagMap[opt.code] || '🌍'}</Text>
                <Text style={[styles.langLabel, active && { color: '#fff' }]}>{opt.full || opt.label}</Text>
                {opt.comingSoon && (
                  <Text style={[styles.langSoon, active && { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }]}>
                    Soon
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── App Lock ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="lock-closed-outline" iconBg="#e8eaf6" iconColor="#5c6bc0"
          title="App Lock" subtitle="Lock the app after inactivity"
        />
        <View style={styles.speedRow}>
          {LOCK_OPTIONS.map((opt) => {
            const sel = lockTimeout === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.speedBtn, sel && { backgroundColor: '#5c6bc0', borderColor: '#5c6bc0' }]}
                onPress={() => handleLockTimeout(opt.value)}
              >
                <Text style={[styles.speedLabel, sel && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Visual Effects ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="sparkles-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="Visual Effects" subtitle="Pathway Ring, Journey Aurora, Constellation"
        />
        <RowToggle
          icon="sparkles-outline" label={vfxEnabled ? 'Effects On' : 'Effects Off'}
          subtitle={vfxEnabled ? 'All signature animations active' : 'Minimal experience — saves battery'}
          value={vfxEnabled} onValueChange={toggleVfx}
          iconColor={colors.primary} trackActiveColor={colors.primary + '80'}
        />
      </View>

      {/* ── Quiz Personalization ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="location-outline" iconBg="#E3F2FD" iconColor="#1565C0"
          title="Quiz Personalization" subtitle="See your governor, senators & capital in civics questions"
        />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          <Text style={{ fontSize: 14, color: '#888', lineHeight: 20 }}>
            Your ZIP code personalizes civic answers for your state.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              style={[styles.zipInput, { borderColor: detectedState ? colors.primary : '#e0e0e0' }]}
              value={zipInput}
              onChangeText={(t) => setZipInput(t.replace(/\D/g, '').slice(0, 5))}
              placeholder="Enter ZIP code"
              placeholderTextColor="#ccc"
              keyboardType="number-pad"
              maxLength={5}
              returnKeyType="done"
              onSubmitEditing={handleSaveZip}
            />
            <TouchableOpacity
              style={[styles.zipSaveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveZip}
              activeOpacity={0.85}
            >
              {zipSaved
                ? <Ionicons name="checkmark" size={18} color="#fff" />
                : <Text style={styles.zipSaveBtnTxt}>Save</Text>}
            </TouchableOpacity>
          </View>
          {detectedState ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={15} color="#10B981" />
              <Text style={{ fontSize: 14, color: '#10B981', fontWeight: '600' }}>
                {STATE_DATA[detectedState]?.name ?? detectedState}
              </Text>
            </View>
          ) : zipInput.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="warning-outline" size={15} color="#F59E0B" />
              <Text style={{ fontSize: 14, color: '#F59E0B', fontWeight: '600' }}>ZIP not recognized</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Helper Tips ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="chatbubble-ellipses-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="Helper Tips" subtitle="Contextual guides for each screen"
        />
        <RowToggle
          icon="bulb-outline" label="Show Helper Tips"
          subtitle="Small tips that appear the first time you visit each screen"
          value={tipsEnabled} onValueChange={setTipsEnabled}
          iconColor={colors.primary} trackActiveColor={colors.primary + '80'}
        />
        <RowLink
          icon="play-circle-outline" label="Replay App Introduction"
          iconColor={colors.primary} onPress={replayIntro}
        />
      </View>

      {/* ── Subscription ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="card-outline" iconBg="#E8EDF0" iconColor="#0F2A3D"
          title="Subscription"
        />
        <View style={styles.subPlanRow}>
          <View style={[styles.subPlanBadge, {
            backgroundColor: isPro ? '#0F2A3D' : '#888',
          }]}>
            <Text style={styles.subPlanBadgeTxt}>
              {isPro ? 'PRO' : 'FREE'}
            </Text>
          </View>
          {subscriptionStatus ? (
            <Text style={styles.subStatusTxt}>
              {subscriptionStatus === 'active' ? 'Active' : subscriptionStatus}
            </Text>
          ) : null}
        </View>
        {renewsAt ? (
          <Text style={styles.subRenewsTxt}>
            {'Renews ' + new Date(renewsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        ) : null}
        {isPro ? (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.rowLink}
              onPress={handleBillingPortal}
              activeOpacity={0.7}
              disabled={portalLoading}
            >
              <Ionicons name="card-outline" size={20} color="#0F2A3D" />
              <Text style={styles.rowLinkLabel}>Manage Billing</Text>
              {portalLoading
                ? <ActivityIndicator size="small" color="#0F2A3D" />
                : <Ionicons name="chevron-forward" size={15} color="#bbb" />}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.divider} />
            <RowLink
              icon="star-outline"
              label="Upgrade to Pro"
              iconColor="#0F2A3D"
              value="$6.99/mo"
              onPress={() => navigation.navigate('Upgrade')}
            />
          </>
        )}
      </View>

      {/* ── My Immigration Profile ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="person-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="My Immigration Profile"
          subtitle="Update your status and goals"
        />
        <RowLink
          icon="person-circle-outline"
          label="Edit Profile"
          iconColor={colors.primary}
          onPress={() => navigation.navigate('Profile')}
        />
        <View style={styles.divider} />
        <RowLink
          icon="create-outline"
          label="Redo Immigration Assessment"
          iconColor={colors.primary}
          onPress={async () => {
            if (user) await AsyncStorage.removeItem(`${ONBOARDING_KEY}/${user.id}`).catch(() => {});
            refreshOnboarding();
          }}
        />
        <View style={styles.divider} />
        <RowLink
          icon="calendar-outline"
          label="Update Green Card Date"
          iconColor={colors.primary}
          onPress={() => navigation.navigate('TravelTracker')}
        />
      </View>

      {/* ── Help & Support ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="help-circle-outline" iconBg="#e3f2fd" iconColor="#1976d2"
          title="Help & Support"
        />
        <RowLink icon="help-buoy-outline"    label="FAQ"                       iconColor="#1976d2"  onPress={() => navigation.navigate('FAQ')} />
        <View style={styles.divider} />
        <RowLink icon="book-outline"         label="Immigration Glossary"       iconColor={colors.primary} onPress={() => navigation.navigate('Glossary')} />
        <View style={styles.divider} />
        <RowLink icon="calculator-outline"   label="Cost Calculator"            iconColor="#f57c00"  onPress={() => navigation.navigate('CostCalculator')} />
        <View style={styles.divider} />
        <RowLink icon="mail-outline"         label="Contact Support"            iconColor="#43a047"  onPress={() => Linking.openURL('mailto:support@pathwayusa.app')} />
        <View style={styles.divider} />
        <RowLink icon="star-outline"         label="Rate PathwayUSA"            iconColor="#f59e0b"  onPress={() => Linking.openURL('https://apps.apple.com/app/pathwayusa')} />
        <View style={styles.divider} />
        <RowLink icon="share-outline"        label="Share the App"              iconColor="#43a047"  onPress={handleShareApp} />
        <View style={styles.divider} />
        <RowLink icon="gift-outline"          label="Refer Friends"              iconColor="#e91e63"  onPress={() => navigation.navigate('Referral')} />
      </View>

      {/* ── Legal ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="shield-outline" iconBg="#fce4ec" iconColor="#c62828"
          title="Legal"
        />
        <RowLink icon="lock-closed-outline"  label="Privacy Policy"             iconColor="#c62828"  onPress={() => navigation.navigate('Policy', { tab: 'privacy' })} />
        <View style={styles.divider} />
        <RowLink icon="document-text-outline" label="Terms of Service"          iconColor="#c62828"  onPress={() => navigation.navigate('Policy', { tab: 'terms' })} />
        <View style={styles.divider} />
        <RowLink icon="information-circle-outline" label="About PathwayUSA"    iconColor={colors.primary} onPress={() => navigation.navigate('About')} />
      </View>

      {/* ── Account ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="person-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="Account"
        />
        <RowLink
          icon="key-outline" label={pwSent ? 'Reset link sent!' : 'Change Password'}
          iconColor={colors.primary}
          onPress={handleChangePassword}
          value={pwSending ? 'Sending…' : undefined}
        />
        <View style={styles.divider} />
        <RowLink icon="log-out-outline"    label="Sign Out"        destructive onPress={handleSignOut} />
        <View style={styles.divider} />
        <RowLink icon="trash-outline"      label="Delete Account"  destructive onPress={handleDeleteAccount} />
      </View>

      {/* ── Developer Tools (antoniog.blanc@gmail.com only) ── */}
      {user?.email === 'antoniog.blanc@gmail.com' && (
        <View style={[styles.section, { backgroundColor: '#1a1a2e' }]}>
          <SectionHeader
            icon="code-slash-outline" iconBg="#2a2a4e" iconColor="#64B5F6"
            title="Developer Tools"
            subtitle={`Tier: ${profile?.subscription_tier ?? 'n/a'}`}
          />
          <RowLink
            icon="refresh-circle-outline"
            label="Reset Onboarding"
            iconColor="#F59E0B"
            onPress={async () => {
              if (user) await AsyncStorage.removeItem(`${ONBOARDING_KEY}/${user.id}`).catch(() => {});
              Alert.alert('Done', 'Onboarding reset. Tap "Update My Profile" or restart to re-enter the flow.');
            }}
          />
          <View style={[styles.divider, { backgroundColor: '#2a2a4e' }]} />
          <RowLink
            icon="cloud-download-outline"
            label="Force Reload Profile"
            iconColor="#64B5F6"
            onPress={async () => {
              const updated = await refreshProfile();
              await refreshSub();
              const tier = updated?.subscription_tier ?? profile?.subscription_tier ?? 'n/a';
              Alert.alert('Profile Reloaded', `subscription_tier: ${tier}`);
            }}
          />
        </View>
      )}

      <Text style={[styles.version, { color: colors.textLight || '#bbb' }]}>PathwayUSA v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 16, gap: 12 },

  section:       { borderRadius: 20, overflow: 'hidden', ...SHADOWS.small },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, paddingBottom: 12 },
  sectionIcon:   { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sectionMeta:   { flex: 1 },
  sectionTitle:  { fontSize: 18, fontWeight: '800', color: '#111' },
  sectionSub:    { fontSize: 14, color: '#888', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 20 },

  speedRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16, gap: 8 },
  speedBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', gap: 4, minHeight: 64 },
  speedLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  speedNote:  { fontSize: 12 },

  langRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16, gap: 8 },
  langBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', gap: 3, minHeight: 72 },
  langFlag: { fontSize: 24 },
  langLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
  langSoon: { fontSize: 9, fontWeight: '800', color: '#f57c00', backgroundColor: '#FFF3E0', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden' },

  rowLink:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12, minHeight: 56 },
  rowLinkLabel: { flex: 1, fontSize: 17, fontWeight: '600', color: '#111' },
  rowValue:     { fontSize: 15, color: '#888' },

  rowToggle:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, minHeight: 56 },
  rowToggleBody: { flex: 1 },
  rowToggleLabel:{ fontSize: 17, fontWeight: '600', color: '#111' },
  rowToggleSub:  { fontSize: 14, color: '#888', marginTop: 2 },

  version: { textAlign: 'center', fontSize: 14, marginTop: 8 },

  zipInput:     { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, fontWeight: '600', color: '#111', letterSpacing: 1, borderWidth: 1.5 },
  zipSaveBtn:   { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13, minWidth: 72, alignItems: 'center', justifyContent: 'center' },
  zipSaveBtnTxt:{ fontSize: 15, fontWeight: '700', color: '#fff' },

  subPlanRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 6 },
  subPlanBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  subPlanBadgeTxt:{ fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  subStatusTxt:   { fontSize: 15, color: '#888' },
  subRenewsTxt:   { fontSize: 14, color: '#aaa', paddingHorizontal: 16, paddingBottom: 14 },
});
