import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Linking, Share, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth, REDIRECT_URL } from '../context/AuthContext';
import { useVisualEffects } from '../context/VisualEffectsContext';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../hooks/useSubscription';
import { openBillingPortal } from '../services/stripe';
import { useHelperTips } from '../context/HelperTipsContext';
import { useFirstLaunch } from '../context/FirstLaunchContext';
import { getStateFromZip } from '../lib/zipToState';
import { STATE_DATA } from '../data/stateRepresentatives';
import { ONBOARDING_KEY } from './onboarding/IntakeStack';
import { SectionHeader, RowLink, RowToggle } from '../components/SettingsRow';

const ZIP_KEY = '@pathwayusa/user_zip_code';

export default function SettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { profile, user, updateProfile, signOut, deleteAccount, refreshProfile } = useAuth();
  const { enabled: vfxEnabled, toggle: toggleVfx } = useVisualEffects();
  const insets = useSafeAreaInsets();
  const { plan, isPro, isFree, subscriptionStatus, renewsAt, refresh: refreshSub } = useSubscription();
  const { tipsEnabled, setTipsEnabled } = useHelperTips();
  const { replay: replayIntro } = useFirstLaunch();

  const [portalLoading, setPortalLoading] = useState(false);
  const [pwSending, setPwSending] = useState(false);
  const [pwSent, setPwSent] = useState(false);
  const [zipInput, setZipInput] = useState('');
  const [detectedState, setDetectedState] = useState(null);
  const [zipSaved, setZipSaved] = useState(false);

  // One-time device prefs
  useEffect(() => {
    AsyncStorage.getItem(ZIP_KEY).then((z) => {
      if (z) { setZipInput(z); setDetectedState(getStateFromZip(z)); }
    });
  }, []);

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

  const handleChangePassword = async () => {
    const email = profile?.email || (await supabase.auth.getUser())?.data?.user?.email;
    if (!email) return;
    setPwSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: REDIRECT_URL,
    });
    setPwSending(false);
    if (!error) { setPwSent(true); Alert.alert('Check your email', 'A password reset link has been sent.'); }
    else { Alert.alert('Error', error.message); }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of your account?')) signOut();
      return;
    }
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


  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Grouped settings — each row opens its own sub-screen ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <RowLink
          icon="language-outline" label="Language and Voice"
          iconColor={colors.primary}
          onPress={() => navigation.navigate('LanguageVoiceSettings')}
        />
        <View style={styles.divider} />
        <RowLink
          icon="notifications-outline" label="Reminders"
          iconColor={colors.primary}
          onPress={() => navigation.navigate('RemindersSettings')}
        />
        <View style={styles.divider} />
        <RowLink
          icon="lock-closed-outline" label="Privacy and App Lock"
          iconColor={colors.primary}
          onPress={() => navigation.navigate('PrivacyAppLockSettings')}
        />
        <View style={styles.divider} />
        <RowLink
          icon="person-outline" label="My Immigration Profile"
          iconColor={colors.primary}
          onPress={() => navigation.navigate('MyImmigrationProfileSettings')}
        />
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
          icon="location-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
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
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => navigation.navigate('Upgrade')}
            activeOpacity={0.85}
          >
            <View style={styles.upgradeCardHdr}>
              <Text style={styles.upgradeCardTitle}>PathwayUSA Pro</Text>
              <Text style={styles.upgradeCardPrice}>$6.99/mo</Text>
            </View>
            <Text style={styles.upgradeCardIncludes}>
              Unlimited quizzes · Full roadmap & progress tracking · Document upload · Attorney connection · Offline access · Priority support
            </Text>
            <View style={styles.upgradeCardCta}>
              <Text style={styles.upgradeCardCtaTxt}>See what's included</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Help & Support ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="help-circle-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="Help & Support"
        />
        <RowLink icon="help-buoy-outline"    label="FAQ"                       iconColor={colors.primary} onPress={() => navigation.navigate('FAQ')} />
        <View style={styles.divider} />
        <RowLink icon="book-outline"         label="Immigration Glossary"       iconColor={colors.primary} onPress={() => navigation.navigate('Glossary')} />
        <View style={styles.divider} />
        <RowLink icon="calculator-outline"   label="Cost Calculator"            iconColor={colors.primary} onPress={() => navigation.navigate('CostCalculator')} />
        <View style={styles.divider} />
        <RowLink icon="mail-outline"         label="Contact Support"            iconColor={colors.primary} onPress={() => Linking.openURL('mailto:support@pathwayusa.app')} />
        <View style={styles.divider} />
        <RowLink icon="star-outline"         label="Rate PathwayUSA"            iconColor="#7F8C8D"  onPress={() => Linking.openURL('https://apps.apple.com/app/pathwayusa')} />
        <View style={styles.divider} />
        <RowLink icon="share-outline"        label="Share the App"              iconColor={colors.primary} onPress={handleShareApp} />
        <View style={styles.divider} />
        <RowLink icon="gift-outline"          label="Refer Friends"              iconColor={colors.primary} onPress={() => navigation.navigate('Referral')} />
      </View>

      {/* ── Legal ── */}
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }]}>
        <SectionHeader
          icon="shield-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="Legal"
        />
        <RowLink icon="lock-closed-outline"  label="Privacy Policy"             iconColor={colors.primary} onPress={() => navigation.navigate('Policy', { tab: 'privacy' })} />
        <View style={styles.divider} />
        <RowLink icon="document-text-outline" label="Terms of Service"          iconColor={colors.primary} onPress={() => navigation.navigate('Policy', { tab: 'terms' })} />
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

  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 20 },

  rowLink:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12, minHeight: 56 },
  rowLinkLabel: { flex: 1, fontSize: 17, fontWeight: '600', color: '#111' },

  version: { textAlign: 'center', fontSize: 14, marginTop: 8 },

  upgradeCard:       { padding: 16, gap: 8 },
  upgradeCardHdr:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upgradeCardTitle:  { fontSize: 16, fontWeight: '800', color: '#111' },
  upgradeCardPrice:  { fontSize: 15, fontWeight: '800', color: '#0F2A3D' },
  upgradeCardIncludes: { fontSize: 13, color: '#666', lineHeight: 19 },
  upgradeCardCta:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  upgradeCardCtaTxt: { fontSize: 13, fontWeight: '700', color: '#0F2A3D' },

  zipInput:     { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, fontWeight: '600', color: '#111', letterSpacing: 1, borderWidth: 1.5 },
  zipSaveBtn:   { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13, minWidth: 72, alignItems: 'center', justifyContent: 'center' },
  zipSaveBtnTxt:{ fontSize: 15, fontWeight: '700', color: '#fff' },

  subPlanRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 6 },
  subPlanBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  subPlanBadgeTxt:{ fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  subStatusTxt:   { fontSize: 15, color: '#888' },
  subRenewsTxt:   { fontSize: 14, color: '#aaa', paddingHorizontal: 16, paddingBottom: 14 },
});
