import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl, PanResponder,
  Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { SHADOWS, TYPOGRAPHY }  from '../../theme';
import CircularProgress from '../../components/CircularProgress';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function countryFlag(code) {
  if (!code || code.length < 2) return '🌍';
  try {
    return String.fromCodePoint(...[...code.slice(0, 2).toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)));
  } catch { return '🌍'; }
}

function relDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d    = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 86400000)   return 'Today';
  if (diff < 172800000)  return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const HEALTH_COLORS = { active: '#4caf50', attention: '#FF9800', urgent: '#f44336' };
const HEALTH_LABELS = { active: 'On Track', attention: 'Needs Attention', urgent: 'Urgent' };

function readinessColor(score) {
  if (score >= 71) return '#4caf50';
  if (score >= 41) return '#FF9800';
  return '#f44336';
}

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'On Track' },
  { key: 'attention', label: 'Needs Attention' },
  { key: 'urgent',    label: 'Urgent' },
  { key: 'review',    label: 'Doc Review' },
];

const SWIPE_WIDTH = 224; // 4 × 56 action buttons

// ─── Swipeable Row ────────────────────────────────────────────────────────────

function SwipeRow({ children, onMessage, onApprove, onRemind, onNotes }) {
  const translateX  = useRef(new Animated.Value(0)).current;
  const isOpenRef   = useRef(false);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 12,
      onPanResponderMove: (_, g) => {
        const base = isOpenRef.current ? -SWIPE_WIDTH : 0;
        translateX.setValue(Math.max(-SWIPE_WIDTH, Math.min(0, base + g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        const base   = isOpenRef.current ? -SWIPE_WIDTH : 0;
        const newX   = base + g.dx;
        const open   = newX < -(SWIPE_WIDTH / 2);
        isOpenRef.current = open;
        Animated.spring(translateX, {
          toValue: open ? -SWIPE_WIDTH : 0,
          useNativeDriver: true,
          friction: 8,
          tension: 80,
        }).start();
      },
    })
  ).current;

  const close = () => {
    isOpenRef.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
  };

  const actions = [
    { color: '#2196F3', icon: 'chatbubble-outline',   label: 'Message', onPress: () => { close(); onMessage?.();  } },
    { color: '#4CAF50', icon: 'checkmark-circle-outline', label: 'Approve', onPress: () => { close(); onApprove?.(); } },
    { color: '#FF9800', icon: 'notifications-outline',label: 'Remind',  onPress: () => { close(); onRemind?.();  } },
    { color: '#9E9E9E', icon: 'create-outline',        label: 'Notes',   onPress: () => { close(); onNotes?.();   } },
  ];

  return (
    <View style={{ overflow: 'hidden', borderRadius: 16, marginBottom: 12 }}>
      {/* Action buttons (revealed behind card) */}
      <View style={swipeStyles.actionsRow}>
        {actions.map((a) => (
          <TouchableOpacity key={a.label} style={[swipeStyles.actionBtn, { backgroundColor: a.color }]} onPress={a.onPress} activeOpacity={0.85}>
            <Ionicons name={a.icon} size={20} color="#fff" />
            <Text style={swipeStyles.actionBtnTxt}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Card (draggable) */}
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  actionsRow: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: SWIPE_WIDTH, flexDirection: 'row',
  },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  actionBtnTxt: {
    fontSize: 10, fontWeight: '700', color: '#fff',
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    safe:      { flex: 1, backgroundColor: colors.primary },
    container: { flex: 1, backgroundColor: colors.background },

    header:    { backgroundColor: colors.primary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTxt: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, lineHeight: TYPOGRAPHY.headingLineHeight, color: '#fff', flex: 1 },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

    // Health summary bar
    healthBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', gap: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    healthPill:{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, backgroundColor: '#f7f7f7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
    healthDot: { width: 10, height: 10, borderRadius: 5 },
    healthPillTxt:{ fontSize: 11, fontWeight: '700', color: '#444', flex: 1 },
    healthPillNum:{ fontSize: 14, fontWeight: '900' },

    searchWrap: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    searchBox:  { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, gap: 8, height: 44 },
    searchInput:{ flex: 1, fontSize: 14, color: '#333' },

    filterBar:    { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    filterChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1.5, borderColor: '#e0e0e0' },
    filterChipA:  { backgroundColor: colors.primary, borderColor: colors.primary },
    filterTxt:    { fontSize: 13, fontWeight: '600', color: '#888' },
    filterTxtA:   { color: '#fff' },

    list:      { padding: 16, paddingBottom: 8 },
    swipeHint: { fontSize: 11, color: '#bbb', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },

    card:      { backgroundColor: '#fff', borderRadius: 16, padding: 16, ...SHADOWS.small },
    cardTop:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatarWrap:{ position: 'relative' },
    avatar:    { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    avatarTxt: { fontSize: 18, fontWeight: '900', color: '#fff' },
    statusDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
    cardInfo:  { flex: 1 },
    clientName:{ fontSize: 15, fontWeight: '800', color: '#1a1a2e' },
    clientMeta:{ fontSize: 12, color: '#888', marginTop: 2 },
    badgeRow:  { flexDirection: 'row', gap: 6, marginTop: 4 },
    pendingBadge:{ backgroundColor: '#fff3e0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    pendingTxt:{ fontSize: 11, fontWeight: '700', color: '#e65100' },
    readyBadge:{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
    readyTxt:  { fontSize: 11, fontWeight: '700', color: '#2e7d32' },
    viewBtn:   { backgroundColor: colors.primaryLight ?? '#e8f7f5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewBtnTxt:{ fontSize: 13, fontWeight: '700', color: colors.primary },

    // Readiness section
    readinessRow:{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    readinessInfo:{ flex: 1, gap: 6 },
    progressBar:{ flex: 1, height: 5, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' },
    progressFill:{ height: 5, borderRadius: 3 },
    progressRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressTxt:{ fontSize: 12, fontWeight: '700', color: '#888', minWidth: 36, textAlign: 'right' },
    readinessLabel:{ fontSize: 11, color: '#aaa', fontWeight: '600' },

    cardBottom:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    lastSeen:  { fontSize: 12, color: '#aaa' },
    healthLabel:{ fontSize: 12, fontWeight: '600' },

    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
    emptyTxt:  { fontSize: 15, color: '#aaa', textAlign: 'center', lineHeight: 22 },

    // ── New Lead Requests section ─────────────────────────────────────────────
    leadsSection:       { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: 14, paddingBottom: 8 },
    leadsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
    leadsSectionTitle:  { fontSize: 15, fontWeight: '800', color: '#1A1A2E', flex: 1 },
    leadsBadge:         { backgroundColor: '#E74C3C', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    leadsBadgeTxt:      { fontSize: 11, fontWeight: '900', color: '#fff' },
    leadsScroll:        { paddingHorizontal: 16, paddingBottom: 4, gap: 10 },

    leadCard:     { width: 240, backgroundColor: colors.background, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: '#E8ECE8' },
    leadCardTop:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    leadAvatar:   { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    leadAvatarTxt:{ fontSize: 14, fontWeight: '900', color: '#fff' },
    leadName:     { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
    leadSubmitted:{ fontSize: 11, color: '#7F8C8D', marginTop: 1 },
    leadMeta:     { fontSize: 12, color: '#7F8C8D', fontWeight: '500' },
    leadMetaVal:  { fontWeight: '700', color: '#1A1A2E' },
    leadDesc:     { fontSize: 12, color: '#555', lineHeight: 17, fontStyle: 'italic' },

    acceptBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1B6B5A', borderRadius: 10, paddingVertical: 10, marginTop: 4 },
    acceptBtnLoading:{ opacity: 0.6 },
    acceptBtnTxt:    { fontSize: 13, fontWeight: '700', color: '#fff' },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttorneyClientsScreen({ navigation }) {
  const { user }   = useAuth();
  const { colors } = useTheme();
  const styles     = useMemo(() => makeStyles(colors), [colors]);

  const [clients, setClients]       = useState([]);
  const [leads, setLeads]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery]           = useState('');
  const [filter, setFilter]         = useState('all');
  const [acceptingLead, setAcceptingLead] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: links } = await supabase
      .from('attorney_clients')
      .select(`
        client_id, linked_at,
        profiles!attorney_clients_client_id_fkey(id, full_name, country, created_at)
      `)
      .eq('attorney_id', user.id)
      .order('linked_at', { ascending: false });

    if (!links?.length) { setClients([]); setLoading(false); setRefreshing(false); return; }

    const ids        = links.map((l) => l.client_id);
    const profileMap = Object.fromEntries(links.map((l) => [l.client_id, { ...l.profiles, linked_at: l.linked_at }]));

    // All documents (for pending + total count)
    const { data: allDocs } = await supabase
      .from('roadmap_documents')
      .select('user_id, status, uploaded_at')
      .in('user_id', ids)
      .order('uploaded_at', { ascending: false });

    const pendingMap       = {};
    const docsUploadedMap  = {};
    const lastDocUploadMap = {};
    (allDocs ?? []).forEach((d) => {
      docsUploadedMap[d.user_id] = (docsUploadedMap[d.user_id] ?? 0) + 1;
      if (!lastDocUploadMap[d.user_id] && d.uploaded_at) lastDocUploadMap[d.user_id] = d.uploaded_at;
      if (d.status === 'uploaded') pendingMap[d.user_id] = (pendingMap[d.user_id] ?? 0) + 1;
    });

    // Roadmap progress with latest completion date
    const { data: prog } = await supabase
      .from('user_progress')
      .select('user_id, completed, completed_at')
      .in('user_id', ids);

    const stepsMap = {};
    (prog ?? []).forEach((p) => {
      if (!stepsMap[p.user_id]) stepsMap[p.user_id] = { done: 0, total: 0, lastCompleted: null };
      stepsMap[p.user_id].total++;
      if (p.completed) {
        stepsMap[p.user_id].done++;
        if (p.completed_at && (!stepsMap[p.user_id].lastCompleted || p.completed_at > stepsMap[p.user_id].lastCompleted)) {
          stepsMap[p.user_id].lastCompleted = p.completed_at;
        }
      }
    });

    // Latest message date per client → attorney
    const { data: msgs } = await supabase
      .from('messages')
      .select('from_id, created_at')
      .in('from_id', ids)
      .eq('to_id', user.id)
      .order('created_at', { ascending: false });

    const lastMsgMap = {};
    (msgs ?? []).forEach((m) => { if (!lastMsgMap[m.from_id]) lastMsgMap[m.from_id] = m.created_at; });

    const now = Date.now();

    const enriched = ids.map((id) => {
      const prof      = profileMap[id] ?? {};
      const pending   = pendingMap[id]      ?? 0;
      const docsTotal = docsUploadedMap[id] ?? 0;
      const steps     = stepsMap[id]        ?? { done: 0, total: 1, lastCompleted: null };
      const pct       = steps.total > 0 ? Math.round((steps.done / steps.total) * 100) : 0;

      // Last activity across all event types
      const candidates = [lastMsgMap[id], lastDocUploadMap[id], steps.lastCompleted].filter(Boolean);
      const lastActivityMs = candidates.length > 0 ? Math.max(...candidates.map((d) => new Date(d).getTime())) : 0;
      const lastActivity   = lastActivityMs > 0 ? new Date(lastActivityMs).toISOString() : null;
      const daysInactive   = lastActivityMs > 0 ? Math.floor((now - lastActivityMs) / 86400000) : 999;
      const isActive30     = daysInactive <= 30;

      // Health status
      let status;
      if (daysInactive >= 8 || pending >= 2) status = 'urgent';
      else if (daysInactive >= 4 || pending >= 1) status = 'attention';
      else status = 'active';

      // Readiness score: steps 35% + docs 45% + activity 10% + base quiz 10%
      const stepScore    = (steps.done / Math.max(steps.total, 1)) * 35;
      const docsScore    = Math.min(docsTotal / 8, 1) * 45;
      const activityScore = isActive30 ? 10 : 0;
      const quizScore    = 10;
      const readiness    = Math.min(100, Math.round(stepScore + docsScore + activityScore + quizScore));

      return { ...prof, pending, docsTotal, pct, lastActivity, daysInactive, status, readiness };
    });

    setClients(enriched);

    // Load pending intake leads (no attorney assigned yet)
    const { data: leadRows } = await supabase
      .from('attorney_clients')
      .select('client_id, notes, created_at, profiles!attorney_clients_client_id_fkey(id, full_name, country)')
      .is('attorney_id', null)
      .order('created_at', { ascending: false })
      .limit(20);
    setLeads((leadRows ?? []).map((r) => ({
      id:         r.client_id,
      name:       r.profiles?.full_name ?? 'Anonymous',
      country:    r.profiles?.country   ?? '',
      submittedAt:r.created_at,
      intake:     (() => { try { return JSON.parse(r.notes ?? '{}'); } catch { return {}; } })(),
    })));

    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = useMemo(() => {
    let list = clients;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => (c.full_name ?? '').toLowerCase().includes(q));
    }
    if (filter === 'active')    list = list.filter((c) => c.status === 'active');
    if (filter === 'attention') list = list.filter((c) => c.status === 'attention');
    if (filter === 'urgent')    list = list.filter((c) => c.status === 'urgent');
    if (filter === 'review')    list = list.filter((c) => c.pending > 0);
    return list;
  }, [clients, query, filter]);

  const healthCounts = useMemo(() => ({
    active:    clients.filter((c) => c.status === 'active').length,
    attention: clients.filter((c) => c.status === 'attention').length,
    urgent:    clients.filter((c) => c.status === 'urgent').length,
  }), [clients]);

  const avatarColor = (name) => {
    const COLORS = ['#0F2A3D', '#1A3F5C', '#1D5C73', '#236B7E', '#1E6B5E', '#2A8B7A'];
    let h = 0;
    for (const c of (name ?? 'A')) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
    return COLORS[Math.abs(h) % COLORS.length];
  };

  const acceptLead = async (lead) => {
    Alert.alert(
      'Accept This Lead?',
      `Accepting will link ${lead.name} to your client list. They will be notified that you are taking their case.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAcceptingLead(lead.id);
            const { error } = await supabase
              .from('attorney_clients')
              .update({ attorney_id: user.id })
              .eq('client_id', lead.id)
              .is('attorney_id', null);
            setAcceptingLead(null);
            if (error) { Alert.alert('Error', error.message); return; }
            load();
          },
        },
      ]
    );
  };

  const handleApprove = async (client) => {
    // Find the latest 'uploaded' doc and approve it
    const { data: doc } = await supabase
      .from('roadmap_documents')
      .select('id, document_name')
      .eq('user_id', client.id)
      .eq('status', 'uploaded')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();
    if (!doc) { Alert.alert('No pending docs', 'This client has no documents awaiting approval.'); return; }
    const { error } = await supabase
      .from('roadmap_documents')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', doc.id);
    if (!error) {
      Alert.alert('Approved ✓', `"${doc.document_name}" has been approved.`);
      load();
    }
  };

  const handleRemind = async (client) => {
    Alert.alert(
      'Send Reminder',
      `Send a push reminder to ${client.full_name ?? 'this client'} to continue their next step?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reminder',
          onPress: async () => {
            // Log a reminder event; actual push-to-client requires storing their expo push token
            try {
              await supabase.from('attorney_reminders').insert({
                attorney_id: user.id,
                client_id:   client.id,
                message:     `Follow up with ${client.full_name ?? 'client'}`,
                due_date:    new Date().toISOString().slice(0, 10),
              });
            } catch {}
            Alert.alert('Reminder Sent', `A reminder has been logged for ${client.full_name ?? 'this client'}.`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTxt}>My Clients</Text>
            <Text style={styles.headerSub}>{clients.length} client{clients.length !== 1 ? 's' : ''} linked</Text>
          </View>
          <Ionicons name="people" size={24} color="rgba(255,255,255,0.6)" />
        </View>

        {/* Health summary bar */}
        {clients.length > 0 && (
          <View style={styles.healthBar}>
            {[
              { key: 'active',    color: '#4caf50', label: 'On Track' },
              { key: 'attention', color: '#FF9800', label: 'Attention' },
              { key: 'urgent',    color: '#f44336', label: 'Urgent' },
            ].map((h) => (
              <TouchableOpacity key={h.key} style={styles.healthPill} onPress={() => setFilter(h.key)} activeOpacity={0.8}>
                <View style={[styles.healthDot, { backgroundColor: h.color }]} />
                <Text style={styles.healthPillTxt}>{h.label}</Text>
                <Text style={[styles.healthPillNum, { color: h.color }]}>{healthCounts[h.key]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#aaa" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients by name…"
              placeholderTextColor="#bbb"
              value={query}
              onChangeText={setQuery}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filter === f.key && styles.filterChipA]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTxt, filter === f.key && styles.filterTxtA]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* New Lead Requests */}
        {leads.length > 0 && (
          <View style={styles.leadsSection}>
            <View style={styles.leadsSectionHeader}>
              <Text style={styles.leadsSectionTitle}>New Lead Requests</Text>
              <View style={styles.leadsBadge}>
                <Text style={styles.leadsBadgeTxt}>{leads.length}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.leadsScroll}
            >
              {leads.map((lead) => (
                <View key={lead.id} style={styles.leadCard}>
                  <View style={styles.leadCardTop}>
                    <View style={[styles.leadAvatar, { backgroundColor: avatarColor(lead.name) }]}>
                      <Text style={styles.leadAvatarTxt}>{initials(lead.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leadName}>{lead.name}</Text>
                      <Text style={styles.leadSubmitted}>Submitted {relDate(lead.submittedAt)}</Text>
                    </View>
                  </View>
                  {!!lead.intake.immigration_status && (
                    <Text style={styles.leadMeta}>Status: <Text style={styles.leadMetaVal}>{lead.intake.immigration_status}</Text></Text>
                  )}
                  {!!lead.intake.goal && (
                    <Text style={styles.leadMeta}>Goal: <Text style={styles.leadMetaVal}>{lead.intake.goal}</Text></Text>
                  )}
                  {!!lead.intake.state && (
                    <Text style={styles.leadMeta}>State: <Text style={styles.leadMetaVal}>{lead.intake.state}</Text></Text>
                  )}
                  {!!lead.intake.contact_method && (
                    <Text style={styles.leadMeta}>
                      Contact: <Text style={styles.leadMetaVal}>{lead.intake.contact_method} — {lead.intake.contact_value}</Text>
                    </Text>
                  )}
                  {!!lead.intake.description && (
                    <Text style={styles.leadDesc} numberOfLines={2}>{lead.intake.description}</Text>
                  )}
                  <TouchableOpacity
                    style={[styles.acceptBtn, acceptingLead === lead.id && styles.acceptBtnLoading]}
                    onPress={() => acceptLead(lead)}
                    disabled={acceptingLead === lead.id}
                    activeOpacity={0.8}
                  >
                    {acceptingLead === lead.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.acceptBtnTxt}>Accept Lead</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {loading ? (
          <View style={styles.emptyWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={52} color="#ddd" />
            <Text style={styles.emptyTxt}>
              {clients.length === 0
                ? 'No clients yet.\nShare your invite code from Settings to get started.'
                : 'No clients match your search.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.swipeHint}>← Swipe left on a card for quick actions</Text>
            {filtered.map((client) => {
              const ac = avatarColor(client.full_name);
              const sc = HEALTH_COLORS[client.status];
              const rc = readinessColor(client.readiness);

              return (
                <SwipeRow
                  key={client.id}
                  onMessage={() => navigation.navigate('AttMessages')}
                  onApprove={() => handleApprove(client)}
                  onRemind={() => handleRemind(client)}
                  onNotes={() => navigation.navigate('AttClientDetail', { client })}
                >
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => navigation.navigate('AttClientDetail', { client })}
                    activeOpacity={0.85}
                  >
                    {/* Top row: avatar + info + view button */}
                    <View style={styles.cardTop}>
                      <View style={styles.avatarWrap}>
                        <View style={[styles.avatar, { backgroundColor: ac }]}>
                          <Text style={styles.avatarTxt}>{initials(client.full_name)}</Text>
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: sc }]} />
                      </View>

                      <View style={styles.cardInfo}>
                        <Text style={styles.clientName}>{client.full_name ?? 'Client'}</Text>
                        <Text style={styles.clientMeta}>
                          {countryFlag(client.country)} {client.country ?? 'Unknown'} · Joined {relDate(client.linked_at)}
                        </Text>
                        <View style={styles.badgeRow}>
                          {client.pending > 0 && (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingTxt}>{client.pending} pending</Text>
                            </View>
                          )}
                          {client.readiness >= 85 && (
                            <View style={styles.readyBadge}>
                              <Ionicons name="star" size={10} color="#2e7d32" />
                              <Text style={styles.readyTxt}>Ready for Interview</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => navigation.navigate('AttClientDetail', { client })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.viewBtnTxt}>View</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* Readiness gauge + progress */}
                    <View style={styles.readinessRow}>
                      <CircularProgress
                        size={52}
                        progress={client.readiness / 100}
                        color={rc}
                        strokeWidth={6}
                        bgColor="#eee"
                        innerColor="#fff"
                      >
                        <Text style={{ fontSize: 11, fontWeight: '900', color: rc }}>{client.readiness}</Text>
                      </CircularProgress>
                      <View style={styles.readinessInfo}>
                        <Text style={styles.readinessLabel}>Roadmap Progress</Text>
                        <View style={styles.progressRow}>
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${client.pct}%`, backgroundColor: sc }]} />
                          </View>
                          <Text style={styles.progressTxt}>{client.pct}%</Text>
                        </View>
                        <Text style={styles.readinessLabel}>Readiness Score</Text>
                      </View>
                    </View>

                    {/* Bottom row: last activity + health status */}
                    <View style={styles.cardBottom}>
                      <Text style={styles.lastSeen}>
                        {client.lastActivity
                          ? `Last active ${relDate(client.lastActivity)}`
                          : 'No activity recorded'}
                      </Text>
                      <Text style={[styles.healthLabel, { color: sc }]}>
                        ● {HEALTH_LABELS[client.status]}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </SwipeRow>
              );
            })}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
