import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSpeech } from '../hooks/useSpeech';
import { supabase } from '../lib/supabase';

const PROMPTS = [
  "How are you feeling about your immigration journey today?",
  "What are you most proud of this week?",
  "What is your biggest worry right now?",
  "Why did you choose to come to America?",
  "What does becoming a citizen mean to you?",
  "Who are you doing this for?",
  "What was the hardest part of your journey so far?",
  "What gives you strength when things feel difficult?",
  "Describe the moment you decided to start this journey.",
  "What will you do first when you become a citizen?",
  "What do you miss most about your home country?",
  "What do you love most about your new home?",
  "What advice would you give to someone just starting this journey?",
  "What has surprised you most about America?",
  "What do you want your children to know about this journey?",
];

const MOODS = [
  { key: 'hopeful',  iconName: 'star-outline',          label: 'Hopeful',  color: '#f59e0b' },
  { key: 'proud',    iconName: 'barbell-outline',        label: 'Proud',    color: '#10b981' },
  { key: 'grateful', iconName: 'heart-outline',          label: 'Grateful', color: '#3b82f6' },
  { key: 'happy',    iconName: 'happy-outline',          label: 'Happy',    color: '#8b5cf6' },
  { key: 'anxious',  iconName: 'alert-circle-outline',   label: 'Anxious',  color: '#ef4444' },
  { key: 'tired',    iconName: 'moon-outline',           label: 'Tired',    color: '#6b7280' },
];

function getDailyPrompt() {
  const dayIdx = Math.floor(Date.now() / 86400000) % PROMPTS.length;
  return PROMPTS[dayIdx];
}

function formatEntryDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function EntryCard({ entry, colors, onSpeak, onDelete }) {
  const mood = MOODS.find((m) => m.key === entry.mood);
  return (
    <View style={[styles.entryCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
      <View style={styles.entryHeader}>
        <View style={styles.entryMeta}>
          {mood && (
            <View style={[styles.moodChip, { backgroundColor: mood.color + '20' }]}>
              <Ionicons name={mood.iconName} size={14} color={mood.color} />
              <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
            </View>
          )}
          <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
            {formatEntryDate(entry.created_at)}
          </Text>
        </View>
        <View style={styles.entryActions}>
          <TouchableOpacity onPress={() => onSpeak(entry.content)} style={styles.iconBtn}>
            <Ionicons name="volume-high-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(entry.id)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      {entry.prompt && (
        <Text style={[styles.entryPromptLabel, { color: colors.textSecondary }]}>"{entry.prompt}"</Text>
      )}
      <Text style={[styles.entryContent, { color: colors.text }]}>{entry.content}</Text>
    </View>
  );
}

export default function JournalScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { speak } = useSpeech();
  const insets = useSafeAreaInsets();

  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalVisible, setModal]  = useState(false);
  const [content, setContent]     = useState('');
  const [mood, setMood]           = useState('hopeful');
  const [usePrompt, setUsePrompt] = useState(true);
  const [saving, setSaving]       = useState(false);

  const todayPrompt = getDailyPrompt();

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('journal_entries').insert({
      user_id: user.id,
      content: content.trim(),
      prompt:  usePrompt ? todayPrompt : null,
      mood,
    });
    setSaving(false);
    if (!error) {
      setModal(false);
      setContent('');
      setMood('hopeful');
      loadEntries();
    } else {
      Alert.alert('Error', 'Could not save your entry. Please try again.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Entry', 'This entry will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', user.id);
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }},
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero */}
      <LinearGradient
        colors={[colors.primary, colors.primary + 'cc']}
        style={styles.hero}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroContent}>
          <View>
            <Text style={styles.heroTitle}>Journey Journal</Text>
            <Text style={styles.heroSub}>Your private space to reflect</Text>
          </View>
          <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="book" size={28} color="#fff" />
          </View>
        </View>
        {/* Today's prompt */}
        <View style={styles.promptCard}>
          <Text style={styles.promptLabel}>TODAY'S REFLECTION</Text>
          <Text style={styles.promptText}>"{todayPrompt}"</Text>
        </View>
      </LinearGradient>

      {/* Entries */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Start your journal</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Your thoughts, feelings, and memories of this journey deserve to be remembered.
            </Text>
          </View>
        ) : (
          entries.map((e) => (
            <EntryCard key={e.id} entry={e} colors={colors} onSpeak={speak} onDelete={handleDelete} />
          ))
        )}
      </ScrollView>

      {/* Write entry FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }, SHADOWS.medium]}
        onPress={() => setModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
        <Text style={styles.fabText}>Write Today's Entry</Text>
      </TouchableOpacity>

      {/* Write modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.primary }]}>
            <TouchableOpacity onPress={() => { setModal(false); setContent(''); }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Entry</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving || !content.trim()}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.saveBtn, !content.trim() && { opacity: 0.4 }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Mood */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>HOW ARE YOU FEELING?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodRow}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.moodOption, mood === m.key && { backgroundColor: m.color, borderColor: m.color }]}
                  onPress={() => setMood(m.key)}
                >
                  <Ionicons name={m.iconName} size={18} color={mood === m.key ? '#fff' : m.color} />
                  <Text style={[styles.moodOptionLabel, mood === m.key && { color: '#fff' }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Prompt toggle */}
            <TouchableOpacity
              style={[styles.promptToggle, { borderColor: usePrompt ? colors.primary : '#ddd' }]}
              onPress={() => setUsePrompt(!usePrompt)}
            >
              <Ionicons name={usePrompt ? 'checkbox' : 'square-outline'} size={20} color={usePrompt ? colors.primary : '#bbb'} />
              <Text style={[styles.promptToggleText, { color: colors.text }]}>Use today's prompt</Text>
            </TouchableOpacity>

            {usePrompt && (
              <View style={[styles.promptBanner, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.promptBannerText, { color: colors.primary }]}>"{todayPrompt}"</Text>
              </View>
            )}

            {/* Text input */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>YOUR THOUGHTS</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.primary + '40', backgroundColor: colors.card || '#fff' }]}
              placeholder="Write freely — this is your private space..."
              placeholderTextColor={colors.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  hero:        { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 12 },
  heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle:   { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#fff', lineHeight: TYPOGRAPHY.displayLineHeight },
  heroSub:     { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroIconWrap:{ width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  promptCard:  { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, gap: 6 },
  promptLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' },
  promptText:  { fontSize: 15, color: '#fff', fontStyle: 'italic', lineHeight: 22 },

  list:  { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, lineHeight: TYPOGRAPHY.headingLineHeight },
  emptySub:   { fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 280 },

  entryCard:    { borderRadius: 18, padding: 16, gap: 10 },
  entryHeader:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  entryMeta:    { gap: 6 },
  entryActions: { flexDirection: 'row', gap: 4 },
  iconBtn:      { padding: 6 },

  moodChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  moodEmoji: { fontSize: 14 },
  moodLabel: { fontSize: 12, fontWeight: '700' },

  entryDate:         { fontSize: 12 },
  entryPromptLabel:  { fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  entryContent:      { fontSize: 15, lineHeight: 24 },

  fab:     { position: 'absolute', bottom: 24, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, paddingVertical: 16 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalContainer: { flex: 1 },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle:     { fontSize: 17, fontWeight: '800', color: '#fff' },
  saveBtn:        { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalBody:      { padding: 20, gap: 14 },
  fieldLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },

  moodRow:       { gap: 8, paddingVertical: 4 },
  moodOption:    { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1.5, borderColor: '#ddd', gap: 4 },
  moodOptionEmoji: { fontSize: 22 },
  moodOptionLabel: { fontSize: 12, fontWeight: '600', color: '#333' },

  promptToggle:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  promptToggleText: { fontSize: 14, fontWeight: '500' },
  promptBanner:     { borderRadius: 12, padding: 14 },
  promptBannerText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },

  textArea: { minHeight: 200, borderWidth: 1.5, borderRadius: 16, padding: 16, fontSize: 15, lineHeight: 24 },
});
