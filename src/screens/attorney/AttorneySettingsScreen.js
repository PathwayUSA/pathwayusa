import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Share, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { SHADOWS } from '../../theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function genCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase() +
         Math.random().toString(36).substr(2, 3).toUpperCase();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    safe:       { flex: 1, backgroundColor: colors.primary },
    container:  { flex: 1, backgroundColor: colors.background },
    scroll:     { flex: 1 },
    content:    { padding: 16, gap: 16, paddingBottom: 60 },

    header:     { backgroundColor: colors.primary, padding: 20, alignItems: 'center', gap: 12, paddingTop: 20 },
    avatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
    avatarTxt:  { fontSize: 28, fontWeight: '900', color: '#fff' },
    headerName: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub:  { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
    proBadge:   { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
    proBadgeTxt:{ fontSize: 12, fontWeight: '800', color: '#fff' },

    section:    { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 14, ...SHADOWS.small },
    sectionHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    sectionTitle:{ fontSize: 14, fontWeight: '800', color: '#1a1a2e', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 },

    fieldRow:   { gap: 4 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldInput: { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1a1a2e', borderWidth: 1, borderColor: '#e0e0e0' },

    saveBtn:    { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    saveTxt:    { color: '#fff', fontWeight: '800', fontSize: 15 },

    inviteBox:  { backgroundColor: colors.background, borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: '#e8e8e8' },
    codeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
    codeDisplay:{ flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.primary },
    codeTxt:    { fontSize: 20, fontWeight: '900', color: colors.primary, letterSpacing: 3 },
    copyBtn:    { backgroundColor: colors.primaryLight ?? '#e8f7f5', width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    inviteNote: { fontSize: 12, color: '#888', lineHeight: 17 },
    shareBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13 },
    shareTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },
    genBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12, paddingVertical: 12 },
    genTxt:     { color: colors.primary, fontWeight: '700', fontSize: 14 },

    signOutBtn: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: '#f44336', ...SHADOWS.small },
    signOutTxt: { fontSize: 15, fontWeight: '700', color: '#f44336' },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttorneySettingsScreen() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [fields, setFields] = useState({
    full_name:        '',
    firm_name:        '',
    bar_number:       '',
    specialties:      '',
    languages_spoken: '',
  });
  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving]         = useState(false);
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFields({
      full_name:        profile.full_name        ?? '',
      firm_name:        profile.firm_name        ?? '',
      bar_number:       profile.bar_number       ?? '',
      specialties:      profile.specialties      ?? '',
      languages_spoken: profile.languages_spoken ?? '',
    });
    if (profile.invite_code) {
      setInviteCode(profile.invite_code);
    } else {
      // Auto-generate a code on first load
      generateCode(false);
    }
  }, [profile]);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile(fields);
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Saved', 'Your profile has been updated.');
  };

  const generateCode = async (persist = true) => {
    const code = genCode();
    setInviteCode(code);
    if (persist && user) {
      await supabase.from('profiles').update({ invite_code: code }).eq('id', user.id);
      // Also upsert into attorney_invites
      await supabase.from('attorney_invites').upsert(
        { attorney_id: user.id, invite_code: code },
        { onConflict: 'attorney_id' }
      );
    }
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({ message: inviteCode, title: 'Attorney Invite Code' });
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join me on PathwayUSA!\n\nI'm your immigration attorney and I'll guide you through every step of your case.\n\nDownload PathwayUSA and enter my invite code when prompted:\n\n🔑 ${inviteCode}\n\n— ${profile?.full_name ?? 'Your Attorney'}${profile?.firm_name ? `, ${profile.firm_name}` : ''}`,
        title: 'Join PathwayUSA',
      });
    } catch {}
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const attName = profile?.full_name ?? user?.email ?? 'Attorney';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials(attName)}</Text>
          </View>
          <Text style={styles.headerName}>{attName}</Text>
          <Text style={styles.headerSub}>{user?.email}</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeTxt}>⚖️ Attorney Account</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Profile section */}
          <View style={styles.section}>
            <View style={styles.sectionHdr}>
              <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Profile</Text>
            </View>

            {[
              { key: 'full_name',        label: 'Full Name',        placeholder: 'Your full name' },
              { key: 'firm_name',        label: 'Firm Name',        placeholder: 'Law firm name' },
              { key: 'bar_number',       label: 'Bar Number',       placeholder: 'State bar number' },
              { key: 'specialties',      label: 'Specialties',      placeholder: 'e.g. Family, Employment, Asylum' },
              { key: 'languages_spoken', label: 'Languages Spoken', placeholder: 'e.g. English, Spanish' },
            ].map((f) => (
              <View key={f.key} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={fields[f.key]}
                  onChangeText={(v) => setFields((prev) => ({ ...prev, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor="#bbb"
                />
              </View>
            ))}

            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Save Profile</Text>}
            </TouchableOpacity>
          </View>

          {/* Invite code section */}
          <View style={styles.section}>
            <View style={styles.sectionHdr}>
              <Ionicons name="link-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Client Invite Code</Text>
            </View>

            <View style={styles.inviteBox}>
              <View style={styles.codeRow}>
                <View style={styles.codeDisplay}>
                  <Text style={styles.codeTxt}>{inviteCode || '——————'}</Text>
                </View>
                <TouchableOpacity style={styles.copyBtn} onPress={copyCode} activeOpacity={0.8}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.inviteNote}>
                Share this code with new clients. When they enter it in the PathwayUSA app, they are automatically connected to you as their attorney.
              </Text>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={shareInvite} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={styles.shareTxt}>Share Invite Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.genBtn} onPress={() => generateCode(true)} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
              <Text style={styles.genTxt}>Generate New Code</Text>
            </TouchableOpacity>
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#f44336" />
            <Text style={styles.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
