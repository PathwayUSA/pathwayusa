import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const COUNTRY_FLAGS = {
  Mexico: '🇲🇽', Brazil: '🇧🇷', India: '🇮🇳', China: '🇨🇳', Philippines: '🇵🇭',
  Vietnam: '🇻🇳', 'El Salvador': '🇸🇻', Cuba: '🇨🇺', 'Dominican Republic': '🇩🇴',
  Guatemala: '🇬🇹', Haiti: '🇭🇹', 'South Korea': '🇰🇷', Jamaica: '🇯🇲', Colombia: '🇨🇴',
  Nigeria: '🇳🇬', Ghana: '🇬🇭', Ethiopia: '🇪🇹', Nepal: '🇳🇵', Ukraine: '🇺🇦',
  Venezuela: '🇻🇪', Honduras: '🇭🇳', Pakistan: '🇵🇰', Bangladesh: '🇧🇩', Peru: '🇵🇪',
  Other: '🌍',
};

const FEATURED_STORIES = [
  {
    id: 'f1', name: 'Maria S.', country: 'Mexico', path: 'citizenship', duration_months: 18,
    story: 'After 18 years living in America, studying, working, and raising my children, I finally became a citizen. PathwayUSA helped me prepare for the civics test — I scored 10 out of 10!',
    advice: 'Do not give up. Every step is worth it. The day you take the oath, everything changes.',
    anonymous: false, created_at: '2025-03-15T10:00:00Z',
  },
  {
    id: 'f2', name: 'Jean-Baptiste D.', country: 'Haiti', path: 'green_card', duration_months: 24,
    story: 'I came from Haiti with a dream. It took 2 years and many difficult moments, but today I have my green card. I never stopped studying and preparing with this app.',
    advice: 'Read everything. Understand every document before you sign it. Ask questions.',
    anonymous: false, created_at: '2025-04-02T10:00:00Z',
  },
  {
    id: 'f3', name: 'Anonymous', country: 'India', path: 'citizenship', duration_months: 31,
    story: 'Immigrating from India for an EB-2 visa took 31 months of waiting and paperwork. When I finally raised my hand for the oath, I cried. It was worth every moment.',
    advice: 'Keep perfect records of everything. Every letter, every receipt, every notice. You will need them.',
    anonymous: true, created_at: '2025-02-18T10:00:00Z',
  },
  {
    id: 'f4', name: 'Sofia R.', country: 'Colombia', path: 'citizenship', duration_months: 14,
    story: 'I was so nervous about the English interview. I practiced every day on PathwayUSA and answered all the civics questions correctly. Now I am an American citizen!',
    advice: 'Practice your English every single day. Watch American TV, read American news. It will pay off.',
    anonymous: false, created_at: '2025-05-01T10:00:00Z',
  },
];

const PATH_COLORS = { citizenship: '#1565c0', green_card: '#2e7d32', asylum: '#7b1fa2', other: '#e65100' };
const PATH_LABELS = { citizenship: 'Citizenship', green_card: 'Green Card', asylum: 'Asylum', other: 'Other' };
const PATHS_LIST  = ['citizenship', 'green_card', 'asylum', 'other'];
const COUNTRIES_LIST = Object.keys(COUNTRY_FLAGS);

function StoryCard({ story, colors }) {
  const [expanded, setExpanded] = useState(false);
  const flag = COUNTRY_FLAGS[story.country] || '🌍';
  const pathColor = PATH_COLORS[story.path] || '#555';

  return (
    <TouchableOpacity
      style={[styles.storyCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.85}
    >
      <View style={styles.storyHeader}>
        <View style={[styles.flagCircle, { backgroundColor: pathColor + '18' }]}>
          <Text style={styles.flagEmoji}>{flag}</Text>
        </View>
        <View style={styles.storyMeta}>
          <Text style={[styles.storyName, { color: colors.text }]}>{story.anonymous ? 'Anonymous' : story.name}</Text>
          <View style={styles.storyTags}>
            <View style={[styles.pathTag, { backgroundColor: pathColor + '18' }]}>
              <Text style={[styles.pathTagText, { color: pathColor }]}>{PATH_LABELS[story.path] || story.path}</Text>
            </View>
            <Text style={[styles.storyCountry, { color: colors.textSecondary }]}>{story.country} · {story.duration_months} months</Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
      </View>

      <Text style={[styles.storyPreview, { color: colors.text }]} numberOfLines={expanded ? 0 : 2}>
        "{story.story}"
      </Text>

      {expanded && story.advice && (
        <View style={[styles.adviceBox, { backgroundColor: pathColor + '12' }]}>
          <Text style={[styles.adviceLabel, { color: pathColor }]}>Advice for others:</Text>
          <Text style={[styles.adviceText, { color: colors.text }]}>{story.advice}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SuccessStoriesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [stories, setStories]     = useState(FEATURED_STORIES);
  const [filter, setFilter]       = useState('all');
  const [modalVisible, setModal]  = useState(false);
  const [storyText, setStoryText] = useState('');
  const [adviceText, setAdvice]   = useState('');
  const [country, setCountry]     = useState('');
  const [path, setPath]           = useState('citizenship');
  const [duration, setDuration]   = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving]       = useState(false);

  const loadStories = useCallback(async () => {
    const { data } = await supabase
      .from('success_stories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data && data.length > 0) {
      setStories([...FEATURED_STORIES, ...data]);
    }
  }, []);

  useEffect(() => { loadStories(); }, [loadStories]);

  const filtered = filter === 'all' ? stories : stories.filter((s) => s.path === filter);

  const handleSubmit = async () => {
    if (!storyText.trim() || !country) return;
    setSaving(true);
    const { error } = await supabase.from('success_stories').insert({
      user_id: user?.id,
      country,
      path,
      duration_months: parseInt(duration) || 0,
      story: storyText.trim(),
      advice: adviceText.trim(),
      anonymous,
    });
    setSaving(false);
    if (!error) {
      setModal(false);
      setStoryText(''); setAdvice(''); setCountry(''); setDuration('');
      loadStories();
      Alert.alert('Thank you!', 'Your story has been shared and will inspire others on their journey.');
    } else {
      Alert.alert('Error', 'Could not save your story. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.heroContent}>
          <View>
            <Text style={styles.heroTitle}>Success Stories</Text>
            <Text style={styles.heroSub}>Read stories from people like you</Text>
          </View>
          <Ionicons name="star" size={40} color="rgba(255,255,255,0.9)" />
        </View>
      </LinearGradient>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {[{ key: 'all', label: 'All Stories' }, ...PATHS_LIST.map((p) => ({ key: p, label: PATH_LABELS[p] }))].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && { backgroundColor: '#f59e0b' }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((s) => (
          <StoryCard key={s.id} story={s} colors={colors} />
        ))}
      </ScrollView>

      {user && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#f59e0b' }, SHADOWS.medium]}
          onPress={() => setModal(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Share Your Story</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.modalWrap, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { backgroundColor: '#f59e0b' }]}>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share Your Story</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving || !storyText.trim() || !country}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.submitBtn, (!storyText.trim() || !country) && { opacity: 0.4 }]}>Share</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>YOUR COUNTRY OF ORIGIN</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {COUNTRIES_LIST.slice(0, 15).map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, country === c && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]} onPress={() => setCountry(c)}>
                  <Text style={{ fontSize: 14 }}>{COUNTRY_FLAGS[c]}</Text>
                  <Text style={[styles.chipText, country === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>IMMIGRATION PATH</Text>
            <View style={styles.pathRow}>
              {PATHS_LIST.map((p) => (
                <TouchableOpacity key={p} style={[styles.pathBtn, path === p && { backgroundColor: PATH_COLORS[p], borderColor: PATH_COLORS[p] }]} onPress={() => setPath(p)}>
                  <Text style={[styles.pathBtnText, path === p && { color: '#fff' }]}>{PATH_LABELS[p]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>HOW LONG DID IT TAKE? (months)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: '#ddd' }]}
              placeholder="e.g. 18"
              placeholderTextColor={colors.textSecondary}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>YOUR STORY</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: '#ddd' }]}
              placeholder="Tell others about your journey..."
              placeholderTextColor={colors.textSecondary}
              value={storyText}
              onChangeText={setStoryText}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>YOUR ADVICE</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: '#ddd', minHeight: 80 }]}
              placeholder="What would you tell someone just starting out?"
              placeholderTextColor={colors.textSecondary}
              value={adviceText}
              onChangeText={setAdvice}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.anonRow} onPress={() => setAnonymous(!anonymous)}>
              <Ionicons name={anonymous ? 'checkbox' : 'square-outline'} size={20} color="#f59e0b" />
              <Text style={[styles.anonText, { color: colors.text }]}>Share anonymously (your name will not be shown)</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero:      { paddingHorizontal: 20, paddingVertical: 20 },
  heroContent:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroEmoji: { fontSize: 40 },

  filterScroll: { flexGrow: 0 },
  filterRow:    { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f5f5f5' },
  filterText:   { fontSize: 13, fontWeight: '600', color: '#555' },

  list: { padding: 16, gap: 12 },
  storyCard:   { borderRadius: 18, padding: 16, gap: 10 },
  storyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flagCircle:  { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  flagEmoji:   { fontSize: 24 },
  storyMeta:   { flex: 1 },
  storyName:   { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  storyTags:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  pathTag:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pathTagText: { fontSize: 11, fontWeight: '700' },
  storyCountry:{ fontSize: 12 },
  storyPreview:{ fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  adviceBox:   { borderRadius: 12, padding: 12, gap: 4 },
  adviceLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  adviceText:  { fontSize: 13, lineHeight: 20 },

  fab:     { position: 'absolute', bottom: 24, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, paddingVertical: 16 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalWrap:   { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle:  { fontSize: 17, fontWeight: '800', color: '#fff' },
  submitBtn:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBody:   { padding: 20, gap: 12 },
  fieldLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd' },
  chipText:    { fontSize: 12, fontWeight: '600', color: '#555' },
  pathRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pathBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd' },
  pathBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  input:       { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  textArea:    { minHeight: 120, borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 14, lineHeight: 22 },
  anonRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  anonText:    { flex: 1, fontSize: 14 },
});
