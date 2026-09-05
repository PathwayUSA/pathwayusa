import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth }     from '../../context/AuthContext';
import { useTheme }    from '../../context/ThemeContext';
import { useAttorney } from '../../context/AttorneyContext';
import { supabase }    from '../../lib/supabase';
import { SHADOWS, TYPOGRAPHY } from '../../theme';
import CommandPulse    from '../../components/effects/CommandPulse';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function relTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000)   return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayStr() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function countryFlag(code) {
  if (!code || code.length < 2) return '🌍';
  try {
    return String.fromCodePoint(...[...code.slice(0, 2).toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)));
  } catch { return '🌍'; }
}

function profileCompleteness(profile) {
  const fields = [
    { key: 'full_name',        label: 'Full name' },
    { key: 'bar_number',       label: 'Bar number' },
    { key: 'specialties',      label: 'Specialties' },
    { key: 'languages_spoken', label: 'Languages' },
    { key: 'firm_name',        label: 'Firm name' },
  ];
  const done = fields.filter((f) => profile?.[f.key]?.trim?.());
  return { pct: Math.round((done.length / fields.length) * 100), missing: fields.filter((f) => !profile?.[f.key]?.trim?.()), fields };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    safe:       { flex: 1, backgroundColor: colors.primary },
    container:  { flex: 1, backgroundColor: colors.background },
    scroll:     { flex: 1 },

    // Header
    header:     { backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, overflow: 'hidden' },
    pulseWrap:  { position: 'absolute', top: -30, right: -30, opacity: 0.6 },
    headerTop:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar:     { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
    avatarTxt:  { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerInfo: { flex: 1 },
    greetTxt:   { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
    nameTxt:    { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#fff', lineHeight: TYPOGRAPHY.displayLineHeight },
    dateTxt:    { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
    onlinePill: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    onlineTxt:  { fontSize: 12, color: '#a5ffde', fontWeight: '700' },
    verifiedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, backgroundColor: 'rgba(255,215,0,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    verifiedTxt:{ fontSize: 11, fontWeight: '700', color: '#FFD700' },

    // Profile completeness banner
    profileBanner:{ backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOWS.small, borderLeftWidth: 4, borderLeftColor: '#FF9800' },
    profileBannerTxt:{ flex: 1 },
    profileBannerTitle:{ fontSize: 13, fontWeight: '800', color: '#1a1a2e' },
    profileBannerSub:{ fontSize: 12, color: '#888', marginTop: 2 },
    profileProgressRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    profileProgressBar:{ flex: 1, height: 5, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' },
    profileProgressFill:{ height: 5, borderRadius: 3, backgroundColor: '#FF9800' },
    profileProgressTxt:{ fontSize: 12, fontWeight: '700', color: '#FF9800', minWidth: 32, textAlign: 'right' },

    // Stats
    statsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, margin: 16, marginBottom: 8 },
    statCard:   { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'flex-start', gap: 6, ...SHADOWS.small },
    statIcon:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    statVal:    { fontSize: 26, fontWeight: '900', color: '#1a1a2e' },
    statLabel:  { fontSize: 11, color: '#888', fontWeight: '500' },

    // Sections
    section:      { paddingHorizontal: 16, marginBottom: 4, marginTop: 8 },
    sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, color: '#1a1a2e' },
    seeAllTxt:    { fontSize: 13, color: colors.primary, fontWeight: '700' },

    // Quick actions
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
    actionBtn:   { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, ...SHADOWS.small },
    actionIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    actionTxt:   { fontSize: 13, fontWeight: '700', color: '#1a1a2e', textAlign: 'center' },

    // Activity feed
    activityCard: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 10, ...SHADOWS.small, overflow: 'hidden' },
    activityItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    activityIconWrap:{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    activityInfo: { flex: 1 },
    activityMain: { fontSize: 13, fontWeight: '600', color: '#1a1a2e', lineHeight: 18 },
    activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    activitySub:  { fontSize: 12, color: '#888' },
    activityTime: { fontSize: 11, color: '#bbb' },

    // Reminders
    reminderCard: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 10, ...SHADOWS.small, overflow: 'hidden' },
    reminderItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    reminderDot:  { width: 10, height: 10, borderRadius: 5 },
    reminderInfo: { flex: 1 },
    reminderMsg:  { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
    reminderDate: { fontSize: 12, color: '#888', marginTop: 2 },
    reminderAddBtn:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 13 },
    reminderAddTxt:{ fontSize: 13, fontWeight: '700', color: colors.primary },

    // Appointments
    apptCard:    { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 20, ...SHADOWS.small },
    apptItem:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    apptTime:    { alignItems: 'center', width: 44 },
    apptTimeTxt: { fontSize: 13, fontWeight: '800', color: colors.primary },
    apptAmPm:    { fontSize: 11, color: '#aaa' },
    apptInfo:    { flex: 1 },
    apptTitle:   { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
    apptClient:  { fontSize: 12, color: '#888', marginTop: 2 },
    apptDur:     { fontSize: 12, color: colors.primary, fontWeight: '600' },

    emptyCard:   { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, padding: 24, alignItems: 'center', gap: 8, marginBottom: 20, ...SHADOWS.small },
    emptyTxt:    { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 20 },

    // Add Reminder Modal
    modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBox:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    modalTitle:  { fontSize: 18, fontWeight: '900', color: '#1a1a2e', textAlign: 'center' },
    modalLabel:  { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    modalInput:  { backgroundColor: '#f7f7f7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1a1a2e', borderWidth: 1, borderColor: '#e0e0e0' },
    modalSaveBtn:{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    modalSaveTxt:{ color: '#fff', fontWeight: '800', fontSize: 15 },
    modalCancelBtn:{ alignItems: 'center', paddingVertical: 10 },
    modalCancelTxt:{ color: '#888', fontWeight: '600', fontSize: 14 },

    clientPickerWrap:{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, overflow: 'hidden', maxHeight: 140 },
    clientPickerItem:{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    clientPickerTxt: { fontSize: 14, color: '#1a1a2e' },
    clientPickerSel: { backgroundColor: colors.primaryLight ?? '#e8f7f5' },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttorneyHomeScreen({ navigation }) {
  const { user, profile }                                       = useAuth();
  const { colors }                                              = useTheme();
  const { pendingDocs, unreadMessages, activityFeed, activityTick, reminders, addReminder, deleteReminder } = useAttorney();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [clientCount, setClientCount]     = useState(0);
  const [allClients, setAllClients]       = useState([]);
  const [appointments, setAppointments]   = useState([]);
  const [perfStats, setPerfStats]         = useState({ docsReviewed: 0, msgsSent: 0, avgReadiness: 0, newClients: 0 });
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [reminderMsg, setReminderMsg]     = useState('');
  const [reminderDate, setReminderDate]   = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  const { pct: profilePct, missing: profileMissing } = useMemo(() => profileCompleteness(profile), [profile]);

  const load = useCallback(async () => {
    if (!user) return;

    const { count } = await supabase
      .from('attorney_clients')
      .select('*', { count: 'exact', head: true })
      .eq('attorney_id', user.id);
    setClientCount(count ?? 0);

    // Clients list for reminder selector
    const { data: links } = await supabase
      .from('attorney_clients')
      .select('client_id, profiles!attorney_clients_client_id_fkey(id, full_name)')
      .eq('attorney_id', user.id)
      .order('linked_at', { ascending: false });
    setAllClients((links ?? []).map((l) => ({ id: l.client_id, name: l.profiles?.full_name ?? 'Client' })));

    const clientIds = (links ?? []).map((l) => l.client_id);

    // Performance: docs reviewed this week
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    let docsReviewed = 0;
    if (clientIds.length) {
      const { count: dr } = await supabase
        .from('roadmap_documents')
        .select('*', { count: 'exact', head: true })
        .in('user_id', clientIds)
        .in('status', ['approved', 'rejected'])
        .gte('updated_at', weekAgo);
      docsReviewed = dr ?? 0;
    }

    // Performance: messages sent this week
    const { count: msgsSent } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('from_id', user.id)
      .gte('created_at', weekAgo);

    // Performance: new clients this month
    const monthAgo = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: newClients } = await supabase
      .from('attorney_clients')
      .select('*', { count: 'exact', head: true })
      .eq('attorney_id', user.id)
      .gte('linked_at', monthAgo);

    // Avg readiness: use roadmap completion % averaged across clients
    let avgReadiness = 0;
    if (clientIds.length) {
      const { data: prog } = await supabase
        .from('user_progress')
        .select('user_id, completed')
        .in('user_id', clientIds);
      const byClient = {};
      (prog ?? []).forEach((p) => {
        if (!byClient[p.user_id]) byClient[p.user_id] = { done: 0, total: 0 };
        byClient[p.user_id].total++;
        if (p.completed) byClient[p.user_id].done++;
      });
      const pcts = Object.values(byClient).map((c) => c.total > 0 ? Math.round((c.done / c.total) * 100) : 0);
      if (pcts.length) avgReadiness = Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length);
    }

    setPerfStats({ docsReviewed, msgsSent: msgsSent ?? 0, avgReadiness, newClients: newClients ?? 0 });

    // Today's and tomorrow's appointments
    const today    = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    try {
      const { data: apts } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_client_id_fkey(full_name)')
        .eq('attorney_id', user.id)
        .gte('date', today)
        .lte('date', tomorrow)
        .order('date')
        .order('time');
      setAppointments(apts ?? []);
    } catch { setAppointments([]); }

    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const STATS = useMemo(() => [
    { icon: 'people',          iconBg: colors.primaryLight ?? '#e8f7f5', iconColor: colors.primary, val: clientCount,            label: 'Total Clients' },
    { icon: 'documents',       iconBg: '#fff3e0',   iconColor: '#e65100', val: pendingDocs,              label: 'Pending Review' },
    { icon: 'chatbubbles',     iconBg: '#fce4ec',   iconColor: '#c2185b', val: unreadMessages,           label: 'Unread Messages' },
    { icon: 'calendar',        iconBg: '#e8f5e9',   iconColor: '#388e3c', val: appointments.length,      label: "Today's Appts" },
    { icon: 'checkmark-done',  iconBg: '#e3f2fd',   iconColor: '#1565c0', val: perfStats.docsReviewed,   label: 'Docs Reviewed (7d)' },
    { icon: 'paper-plane',     iconBg: '#f3e5f5',   iconColor: '#7b1fa2', val: perfStats.msgsSent,       label: 'Messages Sent (7d)' },
    { icon: 'trending-up',     iconBg: '#e8f5e9',   iconColor: '#2e7d32', val: `${perfStats.avgReadiness}%`, label: 'Avg Readiness' },
    { icon: 'person-add',      iconBg: '#fff8e1',   iconColor: '#f57f17', val: perfStats.newClients,     label: 'New Clients (mo)' },
  ], [colors, clientCount, pendingDocs, unreadMessages, appointments, perfStats]);

  const QUICK_ACTIONS = useMemo(() => [
    { icon: 'documents-outline',  label: 'Review Docs',  iconBg: '#fff3e0',                        iconColor: '#e65100', onPress: () => navigation.navigate('AttDocuments') },
    { icon: 'chatbubbles-outline',label: 'Messages',     iconBg: '#fce4ec',                        iconColor: '#c2185b', onPress: () => navigation.navigate('AttMessages') },
    { icon: 'people-outline',     label: 'My Clients',   iconBg: colors.primaryLight ?? '#e8f7f5', iconColor: colors.primary, onPress: () => navigation.navigate('AttClients') },
    { icon: 'share-outline',      label: 'Invite Client',iconBg: '#e8f5e9',                        iconColor: '#388e3c', onPress: () => navigation.navigate('AttSettings') },
  ], [colors, navigation]);

  const handleSaveReminder = async () => {
    if (!reminderMsg.trim() || !reminderDate.trim()) {
      Alert.alert('Missing info', 'Please fill in the reminder message and date (YYYY-MM-DD).');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reminderDate.trim())) {
      Alert.alert('Invalid date', 'Please use the format YYYY-MM-DD.');
      return;
    }
    setSavingReminder(true);
    const { error } = await addReminder({
      clientId:   selectedClient?.id ?? null,
      clientName: selectedClient?.name ?? null,
      message:    reminderMsg.trim(),
      dueDate:    reminderDate.trim(),
    });
    setSavingReminder(false);
    if (error) {
      Alert.alert('Error', 'Could not save reminder. The attorney_reminders table may not exist yet.');
    } else {
      setShowReminderModal(false);
      setReminderMsg('');
      setReminderDate('');
      setSelectedClient(null);
    }
  };

  const attName = profile?.full_name ?? user?.email ?? 'Attorney';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header with Command Pulse ─── */}
          <View style={styles.header}>
            <View style={styles.pulseWrap}>
              <CommandPulse goldTrigger={activityTick} />
            </View>
            <View style={styles.headerTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{initials(attName)}</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.greetTxt}>{greeting()},</Text>
                <Text style={styles.nameTxt} numberOfLines={1}>{profile?.full_name ?? 'Attorney'}</Text>
                <Text style={styles.dateTxt}>{todayStr()}</Text>
                {profilePct === 100 && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#FFD700" />
                    <Text style={styles.verifiedTxt}>Verified Attorney</Text>
                  </View>
                )}
              </View>
              <View style={styles.onlinePill}>
                <Text style={styles.onlineTxt}>● Online</Text>
              </View>
            </View>
          </View>

          {/* ── Profile Completeness Banner ─── */}
          {profilePct < 100 && (
            <TouchableOpacity
              style={styles.profileBanner}
              onPress={() => navigation.navigate('AttSettings')}
              activeOpacity={0.85}
            >
              <Ionicons name="person-circle-outline" size={28} color="#FF9800" />
              <View style={styles.profileBannerTxt}>
                <Text style={styles.profileBannerTitle}>Complete your profile</Text>
                <Text style={styles.profileBannerSub}>
                  {profileMissing.length > 0
                    ? `Missing: ${profileMissing.map((f) => f.label).join(', ')}`
                    : 'Add remaining details to get Verified'}
                </Text>
                <View style={styles.profileProgressRow}>
                  <View style={styles.profileProgressBar}>
                    <View style={[styles.profileProgressFill, { width: `${profilePct}%` }]} />
                  </View>
                  <Text style={styles.profileProgressTxt}>{profilePct}%</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FF9800" />
            </TouchableOpacity>
          )}

          {/* ── Performance Stats Grid ─── */}
          <View style={styles.statsWrap}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.iconBg }]}>
                  <Ionicons name={s.icon} size={18} color={s.iconColor} />
                </View>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Quick Actions ─── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
          </View>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity key={a.label} style={styles.actionBtn} onPress={a.onPress} activeOpacity={0.8}>
                <View style={[styles.actionIcon, { backgroundColor: a.iconBg }]}>
                  <Ionicons name={a.icon} size={22} color={a.iconColor} />
                </View>
                <Text style={styles.actionTxt}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Live Activity Feed ─── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Live Activity</Text>
              {activityFeed.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf50' }} />
                  <Text style={styles.seeAllTxt}>Live</Text>
                </View>
              )}
            </View>
          </View>
          {activityFeed.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="pulse-outline" size={36} color="#ddd" />
              <Text style={styles.emptyTxt}>No recent activity yet.{'\n'}Client uploads and messages will appear here in real time.</Text>
            </View>
          ) : (
            <View style={styles.activityCard}>
              {activityFeed.map((item, idx) => (
                <View key={item.id} style={[styles.activityItem, idx === activityFeed.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.activityIconWrap, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityMain}>{item.main}</Text>
                    <View style={styles.activityMeta}>
                      {item.clientCountry ? <Text style={{ fontSize: 12 }}>{countryFlag(item.clientCountry)}</Text> : null}
                      <Text style={styles.activitySub} numberOfLines={1}>{item.sub}</Text>
                    </View>
                    <Text style={styles.activityTime}>{relTime(item.time)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Reminders ─── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Reminders</Text>
            </View>
          </View>
          <View style={styles.reminderCard}>
            {reminders.length === 0 ? (
              <View style={{ padding: 16 }}>
                <Text style={[styles.emptyTxt, { marginBottom: 0 }]}>No upcoming reminders.{'\n'}Tap + to add one.</Text>
              </View>
            ) : (
              reminders.map((r, idx) => {
                const due = new Date(r.due_date);
                const isToday = due.toDateString() === new Date().toDateString();
                const isPast  = due < new Date();
                const dotColor = isPast ? '#f44336' : isToday ? '#FF9800' : '#4caf50';
                return (
                  <View key={r.id} style={[styles.reminderItem, idx === reminders.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.reminderDot, { backgroundColor: dotColor }]} />
                    <View style={styles.reminderInfo}>
                      <Text style={styles.reminderMsg}>{r.message}</Text>
                      <Text style={styles.reminderDate}>
                        {r.profiles?.full_name ? `${r.profiles.full_name} · ` : ''}
                        {isToday ? 'Today' : due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteReminder(r.id)} activeOpacity={0.7}>
                      <Ionicons name="close-circle-outline" size={20} color="#ddd" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
            <TouchableOpacity
              style={styles.reminderAddBtn}
              onPress={() => setShowReminderModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.reminderAddTxt}>Add Reminder</Text>
            </TouchableOpacity>
          </View>

          {/* ── Today's Appointments ─── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Today & Tomorrow</Text>
            </View>
          </View>
          {appointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={36} color="#ddd" />
              <Text style={styles.emptyTxt}>No upcoming appointments scheduled.</Text>
            </View>
          ) : (
            <View style={styles.apptCard}>
              {appointments.map((apt, idx) => {
                const t = apt.time ? apt.time.slice(0, 5) : '—';
                const [hh, mm] = t.split(':').map(Number);
                const ampm = hh >= 12 ? 'PM' : 'AM';
                const h12  = ((hh % 12) || 12).toString();
                return (
                  <View key={apt.id} style={[styles.apptItem, idx === appointments.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.apptTime}>
                      <Text style={styles.apptTimeTxt}>{h12}:{mm?.toString().padStart(2, '0')}</Text>
                      <Text style={styles.apptAmPm}>{ampm}</Text>
                    </View>
                    <View style={styles.apptInfo}>
                      <Text style={styles.apptTitle}>{apt.title}</Text>
                      <Text style={styles.apptClient}>{apt.profiles?.full_name ?? 'Client'}</Text>
                    </View>
                    <Text style={styles.apptDur}>{apt.duration ?? 30}m</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      {/* ── Add Reminder Modal ─── */}
      <Modal visible={showReminderModal} animationType="slide" transparent onRequestClose={() => setShowReminderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Reminder</Text>

            <View>
              <Text style={styles.modalLabel}>Client (optional)</Text>
              {allClients.length > 0 ? (
                <ScrollView style={styles.clientPickerWrap} nestedScrollEnabled>
                  {allClients.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.clientPickerItem, selectedClient?.id === c.id && styles.clientPickerSel]}
                      onPress={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.clientPickerTxt}>{selectedClient?.id === c.id ? '✓ ' : ''}{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={{ color: '#aaa', fontSize: 13 }}>No clients linked yet.</Text>
              )}
            </View>

            <View>
              <Text style={styles.modalLabel}>Reminder</Text>
              <TextInput
                style={styles.modalInput}
                value={reminderMsg}
                onChangeText={setReminderMsg}
                placeholder="e.g. Follow up about medical exam"
                placeholderTextColor="#bbb"
                multiline
                numberOfLines={2}
              />
            </View>

            <View>
              <Text style={styles.modalLabel}>Due Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={reminderDate}
                onChangeText={setReminderDate}
                placeholder="2026-06-15"
                placeholderTextColor="#bbb"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveReminder} disabled={savingReminder} activeOpacity={0.85}>
              {savingReminder ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveTxt}>Save Reminder</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowReminderModal(false)} activeOpacity={0.7}>
              <Text style={styles.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
