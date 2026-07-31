import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Share, Image, ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../lib/supabase';
import { lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';

const COUNTRY_FLAGS = {
  mexico: '🇲🇽', brazil: '🇧🇷', india: '🇮🇳', china: '🇨🇳', philippines: '🇵🇭',
  vietnam: '🇻🇳', el_salvador: '🇸🇻', cuba: '🇨🇺', dominican_republic: '🇩🇴',
  guatemala: '🇬🇹', haiti: '🇭🇹', korea: '🇰🇷', jamaica: '🇯🇲', colombia: '🇨🇴',
  nigeria: '🇳🇬', ghana: '🇬🇭', ethiopia: '🇪🇹', nepal: '🇳🇵', ukraine: '🇺🇦',
};

function getFlag(country) {
  if (!country) return '🌍';
  return COUNTRY_FLAGS[country.toLowerCase().replace(/\s/g, '_')] ?? '🌍';
}

function getPathLabel(path) {
  const map = { green_card: 'Green Card', citizenship: 'Naturalization', work_visa: 'Work Visa', student_visa: 'Student Visa', asylum: 'Asylum', other: 'Other' };
  return map[path] || 'Immigration Journey';
}

function generateReferralCode(userId) {
  if (!userId) return 'PATHWAY2025';
  return 'PW' + userId.slice(0, 6).toUpperCase();
}

function StatCard({ label, value, icon, color, bgColor }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor || '#f5f5f5' }, SHADOWS.small]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const PLAN_CONFIG = {
  free: { label: 'FREE', color: '#9e9e9e', bg: '#f5f5f5', missing: ['Unlimited Quiz', 'Full Roadmap Tracking', 'Attorney Portal', 'Document Sharing', 'Pro Themes'] },
  pro:  { label: 'PRO',  color: '#b8860b', bg: '#FFF8E1', missing: [] },
};

export default function ProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, profile, signOut, updateProfile, deleteAccount } = useAuth();
  const { tier, isPro } = useSubscription();
  const insets = useSafeAreaInsets();

  const [editing, setEditing]         = useState(false);
  const [name, setName]               = useState(profile?.full_name || '');
  const [saving, setSaving]           = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [changingPw, setChangingPw]   = useState(false);
  const [pwSent, setPwSent]           = useState(false);

  const referralCode = generateReferralCode(user?.id);
  const memberSince  = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access in your device settings.');
      return;
    }
    setAvatarLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset  = result.assets[0];
        const ext    = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const path   = `${user.id}.${ext}`;
        let finalUrl = asset.uri;
        try {
          const blob = await fetch(asset.uri).then((r) => r.blob());
          const { error: upErr } = await supabase.storage
            .from('avatars')
            .upload(path, blob, { contentType: `image/${ext}`, upsert: true });
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
            finalUrl = publicUrl;
          }
        } catch {}
        await AsyncStorage.setItem('@pathwayusa/avatar_uri', finalUrl);
        await updateProfile({ avatar_url: finalUrl });
      }
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ full_name: name.trim() });
    setSaving(false);
    setEditing(false);
  };

  const handleShare = () => {
    Share.share({
      message: `I'm using PathwayUSA to prepare for my U.S. citizenship test! Join me with my referral code ${referralCode} at pathwayusa.app`,
      title: 'Join PathwayUSA',
    });
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setChangingPw(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: 'pathwayusa://reset-password',
    });
    setChangingPw(false);
    if (!error) { setPwSent(true); }
    else { Alert.alert('Error', error.message); }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) Alert.alert('Delete Failed', error.message || 'Please try again.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const avatarUrl = profile?.avatar_url;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primary + 'bb']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Avatar */}
        <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrap} disabled={avatarLoading}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Text style={styles.avatarInitial}>
                {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.avatarEdit}>
            {avatarLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        {/* Name */}
        {editing ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={22} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEditing(false); setName(profile?.full_name || ''); }}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nameRow} onPress={() => setEditing(true)}>
            <Text style={styles.heroName}>{profile?.full_name || 'Your Name'}</Text>
            <Ionicons name="pencil-outline" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        <Text style={styles.heroEmail}>{user?.email}</Text>
        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>{getFlag(profile?.country)} {profile?.country?.replace(/_/g, ' ') || 'Your Country'}</Text>
          <Text style={styles.heroDot}>·</Text>
          <Text style={styles.heroMetaText}>Member since {memberSince}</Text>
        </View>

      </LinearGradient>

      {/* Path badge */}
      <View style={[styles.pathBadge, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        <Ionicons name="map-outline" size={18} color={colors.primary} />
        <Text style={[styles.pathText, { color: colors.text }]}>
          {getPathLabel(profile?.immigration_path)}
        </Text>
        {isPro && (
          <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Subscription status */}
      {(() => {
        const plan = PLAN_CONFIG[tier] ?? PLAN_CONFIG.free;
        return (
          <View style={[styles.section, { backgroundColor: colors.card || '#fff' }, SHADOWS.small, { marginHorizontal: 16 }]}>
            <View style={[styles.actionRow, { paddingBottom: 12 }]}>
              <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: plan.bg }]}>
                <Text style={{ fontSize: 12, fontWeight: '900', color: plan.color, letterSpacing: 1 }}>{plan.label}</Text>
              </View>
              <View style={styles.actionBody}>
                <Text style={[styles.actionLabel, { color: colors.text }]}>Current Plan</Text>
                <Text style={[styles.actionSub, { color: colors.textSecondary }]}>
                  {tier === 'pro' ? 'Full access — thank you for supporting PathwayUSA!' :
                   'Free plan · Upgrade to Pro to unlock all features'}
                </Text>
              </View>
              {!isPro && (
                <TouchableOpacity
                  style={{ backgroundColor: '#F5A623', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
                  onPress={() => navigation.navigate('Upgrade')}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
            {plan.missing.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  Locked on your plan
                </Text>
                {plan.missing.map((feature) => (
                  <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="lock-closed-outline" size={14} color="#f0a500" />
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>{feature}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5A623', borderRadius: 12, paddingVertical: 11, justifyContent: 'center' }}
                  onPress={() => navigation.navigate('Upgrade')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="star" size={15} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Upgrade to Pro · $6.99/month</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })()}

      {/* Referral */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>REFERRAL CODE</Text>
      <View style={[styles.referralCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        <View style={styles.referralTop}>
          <Text style={[styles.referralCode, { color: colors.primary }]}>{referralCode}</Text>
          <TouchableOpacity onPress={handleShare} style={[styles.shareBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.referralDesc, { color: colors.textSecondary }]}>
          Share your referral code to invite friends to PathwayUSA
        </Text>
      </View>

      {/* Quick Links */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MY TOOLS</Text>
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Journal')}>
          <Ionicons name="journal-outline" size={20} color={colors.primary} />
          <View style={styles.actionBody}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Journey Journal</Text>
            <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Write about your immigration journey</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Family')}>
          <Ionicons name="home-outline" size={20} color={colors.primary} />
          <View style={styles.actionBody}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Family Mode</Text>
            <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Track your whole family's journey</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Account actions */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCOUNT</Text>
      <View style={[styles.section, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        <TouchableOpacity style={styles.actionRow} onPress={handleForgotPassword} disabled={changingPw || pwSent}>
          <Ionicons name="key-outline" size={20} color={colors.primary} />
          <View style={styles.actionBody}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Change Password</Text>
            {pwSent && <Text style={[styles.actionSub, { color: '#4caf50' }]}>Reset link sent to your email!</Text>}
          </View>
          {changingPw ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={16} color="#ef4444" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Delete Account</Text>
          <Ionicons name="chevron-forward" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { gap: 12 },

  hero: { alignItems: 'center', paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24, gap: 8 },

  avatarWrap:        { position: 'relative', marginBottom: 4 },
  avatar:            { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarInitial:     { fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarEdit:        { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroName:    { fontSize: 22, fontWeight: '900', color: '#fff' },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput:   { fontSize: 20, fontWeight: '800', color: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.5)', minWidth: 160, paddingBottom: 2 },

  heroEmail:    { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  heroMeta:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  heroDot:      { color: 'rgba(255,255,255,0.5)' },

  xpWrap:    { width: '100%', gap: 6, marginTop: 8 },
  xpLevel:   { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  xpBarBg:   { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },

  pathBadge:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, borderRadius: 16, padding: 14 },
  pathText:   { flex: 1, fontSize: 15, fontWeight: '600' },
  proBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  proText:    { color: '#fff', fontSize: 11, fontWeight: '800' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginHorizontal: 16, marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10 },
  statCard:  { width: '47%', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#888', textAlign: 'center' },

  referralCard:  { marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 10 },
  referralTop:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  referralCode:  { flex: 1, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  shareBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  shareBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  referralDesc:  { fontSize: 13, lineHeight: 18 },

  section:    { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  actionRow:  { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  actionBody: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '600' },
  actionSub:  { fontSize: 12, marginTop: 2 },
  divider:    { height: 1, backgroundColor: '#f0f0f0', marginLeft: 48 },
});
