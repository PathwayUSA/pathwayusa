import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Modal, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAttorney } from '../../context/AttorneyContext';
import { supabase } from '../../lib/supabase';
import { getStepTitle, getStatusTheme } from '../../lib/immigrationSteps';
import { SHADOWS } from '../../theme';

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
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeStr(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const AVATAR_COLORS = ['#1565c0', '#6a1b9a', '#2e7d32', '#e65100', '#c2185b', '#00838f'];
function avatarColor(name) {
  let h = 0;
  for (const c of (name ?? 'A')) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function groupDocsByStep(docs) {
  const groups = {};
  docs.forEach((d) => {
    const key = d.step_id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  });
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => {
      const na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    })
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    safe:        { flex: 1, backgroundColor: colors.primary },
    container:   { flex: 1, backgroundColor: colors.background },

    header:      { backgroundColor: colors.primary, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerInfo:  { flex: 1 },
    headerName:  { fontSize: 17, fontWeight: '900', color: '#fff' },
    headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    avatarSmall: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarTxt:   { fontSize: 16, fontWeight: '900', color: '#fff' },

    tabBar:      { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabBtn:      { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabBtnA:     { borderBottomColor: colors.primary },
    tabTxt:      { fontSize: 12, fontWeight: '600', color: '#aaa' },
    tabTxtA:     { color: colors.primary, fontWeight: '800' },

    scroll:      { flex: 1 },
    content:     { padding: 16, gap: 14, paddingBottom: 40 },

    // Overview
    clientCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 16, ...SHADOWS.small },
    clientRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    avatar:      { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    cAvtTxt:     { fontSize: 22, fontWeight: '900', color: '#fff' },
    clientName:  { fontSize: 18, fontWeight: '900', color: '#1a1a2e' },
    clientMeta:  { fontSize: 13, color: '#888', marginTop: 2 },
    infoGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    infoItem:    { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '45%' },
    infoTxt:     { fontSize: 13, color: '#555' },
    divider:     { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

    progressCard:{ backgroundColor: '#fff', borderRadius: 16, padding: 16, ...SHADOWS.small },
    progressHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    progressTit: { fontSize: 15, fontWeight: '800', color: '#1a1a2e' },
    progressPct: { fontSize: 22, fontWeight: '900', color: colors.primary },
    barWrap:     { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
    barFill:     { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
    stepRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
    stepDot:     { width: 10, height: 10, borderRadius: 5 },
    stepTxt:     { fontSize: 13, color: '#555', flex: 1 },

    // Documents
    stepSection: { backgroundColor: '#fff', borderRadius: 16, padding: 14, ...SHADOWS.small },
    stepTitle:   { fontSize: 13, fontWeight: '800', color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    docRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    docName:     { fontSize: 13, color: '#333', flex: 1, lineHeight: 18 },
    statusPill:  { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
    statusTxt:   { fontSize: 11, fontWeight: '700' },
    docActions:  { flexDirection: 'row', gap: 6, marginTop: 4 },
    approveBtn:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e8f5e9' },
    approveTxt:  { fontSize: 12, fontWeight: '700', color: '#388e3c' },
    reviseBtn:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff3e0' },
    reviseTxt:   { fontSize: 12, fontWeight: '700', color: '#e65100' },
    reviewNote:  { fontSize: 12, color: '#e65100', marginTop: 3, lineHeight: 17 },

    // Messages
    msgContainer:{ flex: 1 },
    msgScroll:   { flex: 1, padding: 16 },
    bubble:      { maxWidth: '75%', borderRadius: 16, padding: 12, marginBottom: 6 },
    bubbleMe:    { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    bubbleThem:  { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, ...SHADOWS.small },
    bubbleTxt:   { fontSize: 14, lineHeight: 20 },
    bubbleTxtMe: { color: '#fff' },
    bubbleTxtTh: { color: '#1a1a2e' },
    bubbleTime:  { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, alignSelf: 'flex-end' },
    bubbleTimeTh:{ fontSize: 11, color: '#aaa', marginTop: 4, alignSelf: 'flex-end' },
    composeRow:  { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
    composeInput:{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1a1a2e', maxHeight: 100 },
    sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    sendBtnOff:  { opacity: 0.4 },

    // Notes
    noteCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, ...SHADOWS.small },
    noteTxt:     { fontSize: 14, color: '#1a1a2e', lineHeight: 20, marginBottom: 4 },
    noteDate:    { fontSize: 12, color: '#aaa' },
    addInput:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, fontSize: 14, color: '#1a1a2e', minHeight: 90, textAlignVertical: 'top', ...SHADOWS.small, marginBottom: 10 },
    addBtn:      { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    addBtnTxt:   { color: '#fff', fontWeight: '800', fontSize: 14 },

    // Timeline
    timelineItem:{ flexDirection: 'row', gap: 12, paddingVertical: 8 },
    timelineLine:{ alignItems: 'center', gap: 0 },
    tlDot:       { width: 12, height: 12, borderRadius: 6 },
    tlLine:      { width: 2, flex: 1, backgroundColor: '#e0e0e0', marginTop: 4 },
    tlInfo:      { flex: 1, paddingBottom: 8 },
    tlMain:      { fontSize: 13, fontWeight: '600', color: '#1a1a2e', lineHeight: 18 },
    tlSub:       { fontSize: 12, color: '#888', marginTop: 2 },
    tlTime:      { fontSize: 11, color: '#aaa', marginTop: 2 },

    emptyWrap:   { justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
    emptyTxt:    { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 20 },

    // Review modal
    overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
    modalTitle:  { fontSize: 18, fontWeight: '900', color: '#1a1a2e' },
    modalSub:    { fontSize: 13, color: '#888' },
    modalLabel:  { fontSize: 13, fontWeight: '700', color: '#555' },
    modalInput:  { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 14, color: '#333', minHeight: 80, textAlignVertical: 'top' },
    modalBtns:   { flexDirection: 'row', gap: 10 },
    cancelBtn:   { flex: 1, borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    cancelTxt:   { fontSize: 14, fontWeight: '700', color: '#888' },
    submitBtn:   { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    submitTxt:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const TABS = ['overview', 'documents', 'messages', 'notes'];
const TAB_LABELS = { overview: 'Overview', documents: 'Documents', messages: 'Messages', notes: 'Notes' };

export default function AttorneyClientDetailScreen({ route, navigation }) {
  const { client, initialTab } = route.params;
  const { user }   = useAuth();
  const { colors } = useTheme();
  const { refreshCounts } = useAttorney();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab]             = useState(initialTab ?? 'overview');
  const [fullProfile, setFullProfile] = useState(client);

  // Overview
  const [progress, setProgress]   = useState([]);
  const [loadingOver, setLoadingOver] = useState(true);

  // Documents
  const [docs, setDocs]           = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Messages
  const [messages, setMessages]   = useState([]);
  const [draft, setDraft]         = useState('');
  const [sending, setSending]     = useState(false);
  const scrollRef                 = useRef(null);

  // Notes
  const [notes, setNotes]         = useState([]);
  const [noteText, setNoteText]   = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // ── Overview ────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', client.id).maybeSingle()
      .then(({ data }) => { if (data) setFullProfile(data); });
  }, [client.id]);

  useEffect(() => {
    if (tab !== 'overview') return;
    setLoadingOver(true);
    supabase.from('user_progress').select('*').eq('user_id', client.id)
      .then(({ data }) => { setProgress(data ?? []); setLoadingOver(false); });
  }, [client.id, tab]);

  // ── Documents ───────────────────────────────────────────────────────────────

  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    const { data } = await supabase
      .from('roadmap_documents')
      .select('*, document_reviews(id, status, comment, reviewed_at)')
      .eq('user_id', client.id)
      .order('step_id');
    setDocs(data ?? []);
    setLoadingDocs(false);
  }, [client.id]);

  useEffect(() => {
    if (tab !== 'documents') return;
    loadDocs();
    const ch = supabase
      .channel(`attdet_docs_${user?.id}_${client.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roadmap_documents', filter: `user_id=eq.${client.id}` },
        loadDocs)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [tab, loadDocs, user, client.id]);

  const submitReview = async () => {
    if (!reviewModal) return;
    if (reviewModal.action === 'revise' && !reviewComment.trim()) {
      Alert.alert('Required', 'Please explain what needs to be fixed.'); return;
    }
    setSubmitting(true);
    const status = reviewModal.action === 'approve' ? 'approved' : 'needs_revision';
    await supabase.from('document_reviews').upsert({
      document_id: reviewModal.doc.id,
      attorney_id: user.id,
      status,
      comment: reviewComment.trim() || null,
      reviewed_at: new Date().toISOString(),
    }, { onConflict: 'document_id' });
    await supabase.from('roadmap_documents').update({ status }).eq('id', reviewModal.doc.id);
    setDocs((prev) => prev.map((d) =>
      d.id === reviewModal.doc.id
        ? { ...d, status, document_reviews: [{ status, comment: reviewComment.trim() || null }] }
        : d
    ));
    refreshCounts();
    setSubmitting(false);
    setReviewModal(null);
    setReviewComment('');
  };

  // ── Messages ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || tab !== 'messages') return;
    supabase
      .from('messages').select('*')
      .or(`and(from_id.eq.${user.id},to_id.eq.${client.id}),and(from_id.eq.${client.id},to_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? []);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
      });

    const ch = supabase
      .channel(`attdet_msgs_${user.id}_${client.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_id=eq.${user.id}` },
        (p) => {
          if (p.new.from_id === client.id) {
            setMessages((prev) => [...prev, p.new]);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [tab, user, client.id]);

  const sendMessage = async () => {
    if (!draft.trim() || !user) return;
    setSending(true);
    const content = draft.trim();
    setDraft('');
    const { error } = await supabase.from('messages').insert({ from_id: user.id, to_id: client.id, content });
    if (!error) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), from_id: user.id, to_id: client.id, content, created_at: new Date().toISOString() }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
    setSending(false);
  };

  // ── Notes ───────────────────────────────────────────────────────────────────

  const loadNotes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('attorney_notes')
      .select('*')
      .eq('attorney_id', user.id)
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });
    setNotes(data ?? []);
  }, [user, client.id]);

  useEffect(() => { if (tab === 'notes') loadNotes(); }, [tab, loadNotes]);

  const saveNote = async () => {
    if (!noteText.trim() || !user) return;
    setSavingNote(true);
    const { data } = await supabase
      .from('attorney_notes')
      .insert({ attorney_id: user.id, client_id: client.id, note: noteText.trim() })
      .select().single();
    if (data) { setNotes((prev) => [data, ...prev]); setNoteText(''); }
    setSavingNote(false);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const completedSteps = progress.filter((p) => p.completed).length;
  const totalSteps     = Math.max(progress.length, 1);
  const pct            = progress.length ? Math.round((completedSteps / progress.length) * 100) : 0;
  const groupedDocs    = useMemo(() => groupDocsByStep(docs), [docs]);
  const acColor        = avatarColor(client.full_name);

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderOverview = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Client info card */}
      <View style={styles.clientCard}>
        <View style={styles.clientRow}>
          <View style={[styles.avatar, { backgroundColor: acColor }]}>
            <Text style={styles.cAvtTxt}>{initials(fullProfile.full_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{fullProfile.full_name ?? 'Client'}</Text>
            <Text style={styles.clientMeta}>{countryFlag(fullProfile.country)} {fullProfile.country ?? 'Unknown'}</Text>
          </View>
        </View>
        <View style={styles.infoGrid}>
          {fullProfile.email && (
            <TouchableOpacity style={styles.infoItem} onPress={() => Linking.openURL(`mailto:${fullProfile.email}`)}>
              <Ionicons name="mail-outline" size={15} color={colors.primary} />
              <Text style={[styles.infoTxt, { color: colors.primary }]}>{fullProfile.email}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={15} color="#888" />
            <Text style={styles.infoTxt}>Joined {relDate(client.linked_at ?? client.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* Roadmap progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHdr}>
          <Text style={styles.progressTit}>Roadmap Progress</Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.barWrap}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        {loadingOver
          ? <ActivityIndicator color={colors.primary} />
          : progress.length === 0
            ? <Text style={styles.emptyTxt}>Client has not started their roadmap yet.</Text>
            : progress.map((p) => (
              <View key={p.id} style={styles.stepRow}>
                <View style={[styles.stepDot, { backgroundColor: p.completed ? '#4caf50' : '#ddd' }]} />
                <Text style={styles.stepTxt}>{getStepTitle(p.step_id)}</Text>
                {p.completed && <Ionicons name="checkmark" size={14} color="#4caf50" />}
              </View>
            ))
        }
      </View>
    </ScrollView>
  );

  const renderDocuments = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {loadingDocs ? (
        <View style={styles.emptyWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : Object.keys(groupedDocs).length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="documents-outline" size={52} color="#ddd" />
          <Text style={styles.emptyTxt}>No documents uploaded yet.</Text>
        </View>
      ) : (
        Object.entries(groupedDocs).map(([stepId, stepDocs]) => (
          <View key={stepId} style={styles.stepSection}>
            <Text style={styles.stepTitle}>{getStepTitle(stepId)}</Text>
            {stepDocs.map((doc) => {
              const review = doc.document_reviews?.[0];
              const theme  = getStatusTheme(doc.status);
              return (
                <View key={doc.id} style={styles.docRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.document_name}</Text>
                    {review?.comment && (
                      <Text style={styles.reviewNote}>Note: {review.comment}</Text>
                    )}
                    {doc.status === 'uploaded' && (
                      <View style={styles.docActions}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => { setReviewModal({ doc, action: 'approve' }); setReviewComment(''); }} activeOpacity={0.8}>
                          <Text style={styles.approveTxt}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reviseBtn} onPress={() => { setReviewModal({ doc, action: 'revise' }); setReviewComment(''); }} activeOpacity={0.8}>
                          <Text style={styles.reviseTxt}>Revise</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {doc.status !== 'uploaded' && (
                      <TouchableOpacity onPress={() => { setReviewModal({ doc, action: doc.status === 'approved' ? 'revise' : 'approve' }); setReviewComment(review?.comment ?? ''); }} activeOpacity={0.8}>
                        <Text style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Change decision</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: theme.bg }]}>
                    <Text style={[styles.statusTxt, { color: theme.text }]}>{theme.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderMessages = () => (
    <KeyboardAvoidingView style={styles.msgContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        ref={scrollRef}
        style={styles.msgScroll}
        contentContainerStyle={{ paddingVertical: 8, gap: 4 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={44} color="#ddd" />
            <Text style={styles.emptyTxt}>No messages yet.{'\n'}Start the conversation below.</Text>
          </View>
        )}
        {messages.map((msg) => {
          const isMe = msg.from_id === user?.id;
          return (
            <View key={msg.id} style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleTxt, isMe ? styles.bubbleTxtMe : styles.bubbleTxtTh]}>{msg.content}</Text>
              <Text style={isMe ? styles.bubbleTime : styles.bubbleTimeTh}>{timeStr(msg.created_at)}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.composeRow}>
        <TextInput
          style={styles.composeInput}
          placeholder={`Message ${fullProfile.full_name?.split(' ')[0] ?? 'client'}…`}
          placeholderTextColor="#bbb"
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnOff]}
          onPress={sendMessage}
          disabled={!draft.trim() || sending}
          activeOpacity={0.85}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderNotes = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TextInput
        style={styles.addInput}
        placeholder="Add a private case note only you can see…"
        placeholderTextColor="#bbb"
        value={noteText}
        onChangeText={setNoteText}
        multiline
      />
      <TouchableOpacity style={styles.addBtn} onPress={saveNote} disabled={savingNote || !noteText.trim()} activeOpacity={0.85}>
        {savingNote ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnTxt}>Save Note</Text>}
      </TouchableOpacity>
      {notes.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTxt}>No case notes yet.</Text>
        </View>
      )}
      {notes.map((n) => (
        <View key={n.id} style={styles.noteCard}>
          <Text style={styles.noteTxt}>{n.note}</Text>
          <Text style={styles.noteDate}>{relDate(n.created_at)}</Text>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{client.full_name ?? 'Client'}</Text>
            <Text style={styles.headerSub}>{countryFlag(client.country)} {client.country ?? ''} · {pct}% complete</Text>
          </View>
          <View style={[styles.avatarSmall, { backgroundColor: acColor }]}>
            <Text style={styles.avatarTxt}>{initials(client.full_name)}</Text>
          </View>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnA]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabTxt, tab === t && styles.tabTxtA]}>{TAB_LABELS[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {tab === 'overview'   && renderOverview()}
        {tab === 'documents'  && renderDocuments()}
        {tab === 'messages'   && renderMessages()}
        {tab === 'notes'      && renderNotes()}
      </View>

      {/* Review modal */}
      <Modal visible={!!reviewModal} transparent animationType="slide" onRequestClose={() => setReviewModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {reviewModal?.action === 'approve' ? 'Approve Document' : 'Request Revision'}
            </Text>
            <Text style={styles.modalSub} numberOfLines={2}>{reviewModal?.doc?.document_name}</Text>
            <Text style={styles.modalLabel}>
              {reviewModal?.action === 'approve' ? 'Comment (optional)' : 'What needs to be fixed? (required)'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={reviewModal?.action === 'approve' ? 'e.g., Looks good and complete.' : 'e.g., Missing page 2 of the tax return.'}
              placeholderTextColor="#bbb"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReviewModal(null)} activeOpacity={0.8}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: reviewModal?.action === 'approve' ? '#388e3c' : '#e65100' }]}
                onPress={submitReview}
                disabled={submitting || (reviewModal?.action === 'revise' && !reviewComment.trim())}
                activeOpacity={0.85}
              >
                <Text style={styles.submitTxt}>
                  {submitting ? 'Saving…' : reviewModal?.action === 'approve' ? 'Approve' : 'Request Revision'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
