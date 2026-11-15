import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl, ScrollView, Modal, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { lightHaptic } from '../utils/haptics';
import { fetchNews, fetchVideos, sortForUser, mayAffect, formatDate, SOURCE_LABEL } from '../lib/news';
import YouTubeVideo, { VideoThumb } from '../components/YouTubeVideo';
import { KindPill, MayAffectTag } from '../components/NewsHomeCard';
import { ONBOARDING_DATA_KEY } from './onboarding/IntakeStack';

export function useNewsUserCtx() {
  const { profile } = useAuth();
  const [intake, setIntake] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DATA_KEY).then((raw) => { if (raw) setIntake(JSON.parse(raw)); }).catch(() => {});
  }, []);
  return {
    status: intake?.immigration_status ?? profile?.immigration_status ?? null,
    goals: intake?.immigration_goals ?? profile?.immigration_goals ?? [],
    country: intake?.country_of_birth ?? profile?.country_of_birth ?? null,
  };
}

export default function ImmigrationNewsScreen({ navigation }) {
  const { colors } = useTheme();
  const ctx = useNewsUserCtx();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'mine'
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState([]);
  const [playing, setPlaying] = useState(null);

  const load = useCallback(async () => {
    const [n, v] = await Promise.all([fetchNews(60), fetchVideos(10)]);
    setItems(n); setVideos(v);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!items) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  const sorted = sortForUser(items, ctx);
  const shown = filter === 'mine' ? sorted.filter((i) => mayAffect(i, ctx)) : items;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }}
      data={shown}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListHeaderComponent={(
        <View style={{ gap: 12, marginBottom: 4 }}>
          <Text style={styles.intro}>
            Updates come only from official government sources. We explain them in plain words so you understand what's changing.
          </Text>
          {videos.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={styles.watchTitle}>Watch: official explainers</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {videos.map((v) => (
                  <TouchableOpacity key={v.youtube_id} style={{ width: 160 }} onPress={() => { lightHaptic(); setPlaying(v); }} activeOpacity={0.85} accessibilityRole="button">
                    <VideoThumb videoId={v.youtube_id} width={160} height={90} />
                    <Text style={styles.vTitle} numberOfLines={2}>{v.title}</Text>
                    <Text style={styles.vMeta}>{v.channel?.name ?? 'Official'} · {v.lang === 'es' ? 'Español' : 'English'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <Modal visible={!!playing} animationType="slide" onRequestClose={() => setPlaying(null)}>
            <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 50, paddingHorizontal: 20, gap: 14 }}>
              <TouchableOpacity onPress={() => setPlaying(null)} style={{ alignSelf: 'flex-end', padding: 6 }} accessibilityLabel="Close video">
                <Ionicons name="close" size={26} color="#1A1A2E" />
              </TouchableOpacity>
              {playing && <YouTubeVideo videoId={playing.youtube_id} title={playing.title} lang={playing.lang} colors={colors} />}
            </View>
          </Modal>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['all', 'All updates'], ['mine', 'May affect you']].map(([key, label]) => (
              <TouchableOpacity
                key={key}
                onPress={() => { lightHaptic(); setFilter(key); }}
                style={[styles.chip, filter === key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipTxt, filter === key && { color: '#fff' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={40} color="#B0B7BB" />
          <Text style={styles.emptyTxt}>
            {filter === 'mine' ? 'Nothing right now that looks like it affects your situation.' : 'No new official updates right now.'}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => { lightHaptic(); navigation.navigate('ImmigrationNewsDetail', { item }); }}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <KindPill kind={item.kind} />
            {mayAffect(item, ctx) && <MayAffectTag />}
          </View>
          <Text style={styles.headline}>{item.headline}</Text>
          <Text style={styles.summary} numberOfLines={3}>{item.summary}</Text>
          <Text style={styles.meta}>{formatDate(item.published_at)} · {SOURCE_LABEL[item.source] ?? 'Official source'}</Text>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); lightHaptic(); Linking.openURL(item.source_url).catch(() => {}); }}
            activeOpacity={0.7}
            accessibilityRole="link"
            style={styles.sourceLink}
          >
            <Ionicons name="open-outline" size={12} color={colors.primary} />
            <Text style={[styles.sourceLinkTxt, { color: colors.primary }]}>Open on {SOURCE_LABEL[item.source] ?? 'official site'}</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>General information, not legal advice.</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro:    { fontSize: 15, color: '#5F6B6D', lineHeight: 22 },
  chip:     { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E3E6', backgroundColor: '#fff' },
  chipTxt:  { fontSize: 14, fontWeight: '800', color: '#5F6B6D' },
  card:     { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 8, ...SHADOWS.small },
  watchTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: 18, color: '#1A1A2E' },
  vTitle:   { fontSize: 13.5, fontWeight: '700', color: '#1A1A2E', marginTop: 6, lineHeight: 18 },
  vMeta:    { fontSize: 11.5, color: '#7F8C8D', marginTop: 2 },
  headline: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: 18, color: '#1A1A2E', lineHeight: 23 },
  summary:  { fontSize: 14.5, color: '#3D4A4C', lineHeight: 21 },
  meta:     { fontSize: 12.5, color: '#7F8C8D' },
  sourceLink:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start' },
  sourceLinkTxt: { fontSize: 12.5, fontWeight: '800' },
  disclaimer:    { fontSize: 11, color: '#9AA0A6', marginTop: 2 },
  empty:    { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyTxt: { fontSize: 15, color: '#7F8C8D', textAlign: 'center', lineHeight: 22, maxWidth: 280 },
});
