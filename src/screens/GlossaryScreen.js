import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, FlatList, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import { useSpeech } from '../hooks/useSpeech';
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES } from '../data/glossaryTerms';

const LANG_MAP = { en: 'en', es: 'es', ht: 'ht' };

function TermCard({ term, lang, colors, onSpeak }) {
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toVal = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(anim, { toValue: toVal, useNativeDriver: false, friction: 8 }).start();
  };

  const l = LANG_MAP[lang] || 'en';
  const displayTerm = l === 'es' ? (term.termEs || term.term) : l === 'ht' ? (term.termHt || term.term) : term.term;
  const definition = term.definition?.[l] || term.definition?.en || '';
  const example    = term.example?.[l]    || term.example?.en    || '';

  const chevronRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const speak = () => {
    const text = `${displayTerm}. ${definition}${example ? ` For example: ${example}` : ''}`;
    onSpeak(text);
  };

  return (
    <View style={[styles.termCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
      <TouchableOpacity style={styles.termHeader} onPress={toggle} activeOpacity={0.8}>
        <View style={[styles.termIconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name={term.icon || 'document-text-outline'} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.termName, { color: colors.text }]} numberOfLines={2}>
          {displayTerm}
        </Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.termBody}>
          <Text style={[styles.defText, { color: colors.text }]}>{definition}</Text>

          {!!example && (
            <View style={[styles.exampleBox, { backgroundColor: colors.primaryLight + '60' }]}>
              <Text style={[styles.exampleLabel, { color: colors.primary }]}>Example</Text>
              <Text style={[styles.exampleText, { color: colors.text }]}>{example}</Text>
            </View>
          )}

          {term.related?.length > 0 && (
            <View style={styles.relatedRow}>
              <Text style={[styles.relatedLabel, { color: colors.textSecondary }]}>Related: </Text>
              <Text style={[styles.relatedText, { color: colors.primary }]}>
                {term.related.join(' · ')}
              </Text>
            </View>
          )}

          <TouchableOpacity style={[styles.speakBtn, { borderColor: colors.primary + '40' }]} onPress={speak}>
            <Ionicons name="volume-high-outline" size={15} color={colors.primary} />
            <Text style={[styles.speakText, { color: colors.primary }]}>Read Aloud</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function GlossaryScreen() {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { speak } = useSpeech();
  const insets = useSafeAreaInsets();

  const [query, setQuery]     = useState('');
  const [category, setCategory] = useState('All');

  const l = LANG_MAP[lang] || 'en';

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return GLOSSARY_TERMS.filter((t) => {
      const matchCat = category === 'All' || t.category === category;
      if (!matchCat) return false;
      if (!q) return true;
      const displayTerm = l === 'es' ? (t.termEs || t.term) : l === 'ht' ? (t.termHt || t.term) : t.term;
      const def = t.definition?.[l] || t.definition?.en || '';
      return displayTerm.toLowerCase().includes(q) || def.toLowerCase().includes(q);
    });
  }, [query, category, l]);

  const handleSpeak = useCallback((text) => { speak(text); }, [speak]);

  const renderItem = useCallback(({ item }) => (
    <TermCard key={item.id} term={item} lang={lang} colors={colors} onSpeak={handleSpeak} />
  ), [lang, colors, handleSpeak]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search terms…"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        {GLOSSARY_CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.card || '#fff', borderColor: '#ddd', borderWidth: 1 },
              ]}
              onPress={() => setCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filtered.length} {filtered.length === 1 ? 'term' : 'terms'}
        </Text>
      </View>

      {/* Terms list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={44} color={colors.textLight || '#ccc'} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No terms match your search</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15 },

  chipScroll: { flexGrow: 0 },
  chipRow:    { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText:   { fontSize: 13, fontWeight: '600' },

  countRow:  { paddingHorizontal: 16, paddingVertical: 6 },
  countText: { fontSize: 12, fontWeight: '500' },

  listContent: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },

  termCard:   { borderRadius: 16, overflow: 'hidden' },
  termHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  termIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  termName:   { flex: 1, fontSize: 15, fontWeight: '700' },

  termBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  defText:  { fontSize: 14, lineHeight: 21 },

  exampleBox:   { borderRadius: 10, padding: 10 },
  exampleLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  exampleText:  { fontSize: 13, lineHeight: 19 },

  relatedRow:   { flexDirection: 'row', flexWrap: 'wrap' },
  relatedLabel: { fontSize: 12 },
  relatedText:  { fontSize: 12, fontWeight: '600', flex: 1 },

  speakBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  speakText: { fontSize: 13, fontWeight: '600' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
