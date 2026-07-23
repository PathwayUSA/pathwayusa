import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { SHADOWS } from '../theme';

function makeStyles(colors) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: colors.background },
    header:      { backgroundColor: colors.primary, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar:      { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
    avatarTxt:   { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerName:  { fontSize: 17, fontWeight: '800', color: '#fff' },
    headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

    tabBar:      { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabBtn:      { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabBtnA:     { borderBottomColor: colors.primary },
    tabTxt:      { fontSize: 12, fontWeight: '600', color: '#aaa' },
    tabTxtA:     { color: colors.primary, fontWeight: '800' },

    section:     { padding: 16 },
    sectionTitle:{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

    statRow:     { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard:    { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', ...SHADOWS.small },
    statVal:     { fontSize: 22, fontWeight: '900', marginBottom: 3 },
    statLabel:   { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },

    progressCard:{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, ...SHADOWS.small },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    progressBar: { flex: 1, height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' },
    progressFill:{ height: 6, borderRadius: 3 },
    progressPct: { fontSize: 13, fontWeight: '700', color: colors.text },
    progressLabel:{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },

    docRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    docCheck:    { width: 22, height: 22, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
    docName:     { flex: 1, fontSize: 13, color: colors.text },

    bubble:      { maxWidth: '75%', borderRadius: 16, padding: 12, marginBottom: 6 },
    bubbleMe:    { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    bubbleThem:  { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, ...SHADOWS.small },
    bubbleTxt:   { fontSize: 14, lineHeight: 20 },
    bubbleTxtMe: { color: '#fff' },
    bubbleTxtTh: { color: colors.text },
    bubbleTime:  { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, alignSelf: 'flex-end' },
    composeRow:  { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
    composeInput:{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
    sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },

    noteCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, ...SHADOWS.small },
    noteText:    { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 4 },
    noteDate:    { fontSize: 11, color: colors.textSecondary },
    addNoteInput:{ backgroundColor: '#fff', borderRadius: 14, padding: 14, fontSize: 14, color: colors.text, minHeight: 90, textAlignVertical: 'top', ...SHADOWS.small, marginBottom: 10 },
    addNoteBtn:  { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    addNoteBtnTxt:{ color: '#fff', fontWeight: '800', fontSize: 14 },

    emptyTxt:    { fontSize: 14, color: '#aaa', textAlign: 'center', padding: 30 },
  });
}

export default function ClientDetailScreen({ route }) {
  const { client } = route.params;
  const { colors } = useTheme();
  const { user }   = useAuth();
  const styles     = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab]           = useState('overview');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);
  const [notes, setNotes]       = useState([]);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [progress, setProgress] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Load roadmap progress & documents
  useEffect(() => {
    Promise.all([
      supabase.from('user_progress').select('*').eq('user_id', client.id),
      supabase.from('user_documents').select('*').eq('user_id', client.id),
    ]).then(([prog, docs]) => {
      setProgress(prog.data ?? []);
      setDocuments(docs.data ?? []);
      setLoadingOverview(false);
    });
  }, [client.id]);

  // Load messages
  useEffect(() => {
    if (!user) return;
    supabase
      .from('messages').select('*')
      .or(`and(from_id.eq.${user.id},to_id.eq.${client.id}),and(from_id.eq.${client.id},to_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []));

    const channel = supabase
      .channel(`att-client:${user.id}:${client.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_id=eq.${user.id}` },
        (p) => setMessages((prev) => [...prev, p.new]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, client.id]);

  // Load notes
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

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const sendMessage = async () => {
    if (!draft.trim() || !user) return;
    setSending(true);
    const content = draft.trim();
    setDraft('');
    const { error } = await supabase.from('messages').insert({ from_id: user.id, to_id: client.id, content });
    if (!error) setMessages((prev) => [...prev, { id: Date.now().toString(), from_id: user.id, to_id: client.id, content, created_at: new Date().toISOString() }]);
    setSending(false);
  };

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

  const initials = (client.full_name || 'C').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const completedSteps = (progress ?? []).filter((p) => p.completed).length;
  const totalSteps     = Math.max((progress ?? []).length, 1);
  const checkedDocs    = documents.filter((d) => d.checked).length;

  const TABS = [
    { key: 'overview',  label: 'Overview' },
    { key: 'messages',  label: 'Messages' },
    { key: 'notes',     label: 'Notes' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{client.full_name || 'Client'}</Text>
          <Text style={styles.headerSub}>Joined {new Date(client.created_at).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabBtnA]} onPress={() => setTab(t.key)} activeOpacity={0.8}>
            <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtA]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' && (
        loadingOverview ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
          <ScrollView contentContainerStyle={styles.section} showsVerticalScrollIndicator={false}>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: colors.primary }]}>{completedSteps}</Text>
                <Text style={styles.statLabel}>Steps Done</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: '#4caf50' }]}>{checkedDocs}</Text>
                <Text style={styles.statLabel}>Docs Checked</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: '#ff9800' }]}>{documents.length - checkedDocs}</Text>
                <Text style={styles.statLabel}>Docs Missing</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Roadmap Progress</Text>
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>Citizenship Journey</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(completedSteps / totalSteps) * 100}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={styles.progressPct}>{completedSteps}/{totalSteps}</Text>
              </View>
              {(progress ?? []).length === 0 && <Text style={styles.emptyTxt}>No progress recorded yet.</Text>}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Document Status</Text>
            {documents.length === 0 ? (
              <Text style={styles.emptyTxt}>No documents uploaded yet.</Text>
            ) : (
              <View style={styles.progressCard}>
                {documents.map((d) => (
                  <View key={d.id} style={styles.docRow}>
                    <View style={[styles.docCheck, { backgroundColor: d.checked ? '#e8f5e9' : '#fafafa' }]}>
                      <Ionicons name={d.checked ? 'checkmark' : 'close'} size={14} color={d.checked ? '#4caf50' : '#ccc'} />
                    </View>
                    <Text style={[styles.docName, !d.checked && { color: '#aaa' }]}>{d.document_name}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )
      )}

      {tab === 'messages' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 14, gap: 2, paddingBottom: 10 }}
            ref={(r) => r?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 && <Text style={styles.emptyTxt}>No messages yet. Send the first one.</Text>}
            {messages.map((msg) => {
              const isMe = msg.from_id === user?.id;
              return (
                <View key={msg.id} style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleTxt, isMe ? styles.bubbleTxtMe : styles.bubbleTxtTh]}>{msg.content}</Text>
                  <Text style={styles.bubbleTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.composeRow}>
            <TextInput style={styles.composeInput} value={draft} onChangeText={setDraft} placeholder="Message client..." placeholderTextColor="#bbb" multiline />
            <TouchableOpacity style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]} onPress={sendMessage} disabled={!draft.trim() || sending}>
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {tab === 'notes' && (
        <ScrollView contentContainerStyle={styles.section} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Private Notes</Text>
          <TextInput
            style={styles.addNoteInput}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Add a private note about this client..."
            placeholderTextColor="#bbb"
            multiline
          />
          <TouchableOpacity style={[styles.addNoteBtn, { opacity: noteText.trim() ? 1 : 0.5 }]} onPress={saveNote} disabled={!noteText.trim() || savingNote}>
            {savingNote ? <ActivityIndicator color="#fff" /> : <Text style={styles.addNoteBtnTxt}>Save Note</Text>}
          </TouchableOpacity>
          <View style={{ height: 16 }} />
          {notes.length === 0 && <Text style={styles.emptyTxt}>No notes yet.</Text>}
          {notes.map((n) => (
            <View key={n.id} style={styles.noteCard}>
              <Text style={styles.noteText}>{n.note}</Text>
              <Text style={styles.noteDate}>{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
