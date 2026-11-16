import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { lightHaptic } from '../utils/haptics';
import { fetchNews, fetchVideos, sortForUser, mayAffect, KIND_STYLE, SOURCE_LABEL, formatDate } from '../lib/news';
import YouTubeVideo from './YouTubeVideo';

export function KindPill({ kind }) {
  const k = KIND_STYLE[kind] ?? KIND_STYLE.change;
  return (
    <View style={[pill.wrap, { backgroundColor: k.bg }]}>
      <Ionicons name={k.icon} size={12} color={k.fg} />
      <Text style={[pill.txt, { color: k.fg }]}>{k.label.toUpperCase()}</Text>
    </View>
  );
}

export function MayAffectTag() {
  const { colors } = useTheme();
  return (
    <View style={[pill.wrap, { backgroundColor: colors.primaryLight }]}>
      <Ionicons name="person" size={11} color={colors.primaryDark} />
      <Text style={[pill.txt, { color: colors.primaryDark }]}>MAY AFFECT YOU</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  txt:  { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6 },
});

/** "What's new in immigration" — one official video up top (large, tap to
 * play, never autoplay), then the 2 articles most relevant to this person
 * as compact cards below. */
export default function NewsHomeCard({ navigation, userCtx }) {
  const { colors } = useTheme();
  const [items, setItems] = useState(null);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    fetchNews(20).then(setItems);
    fetchVideos(1).then(setVideos);
  }, []);

  if (!items || items.length === 0) return null; // nothing official yet: show nothing, never filler
  const topVideo = videos[0];
  const topArticles = sortForUser(items, userCtx).slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.hdr}>
        <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="newspaper" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.primaryDark }]}>OFFICIAL UPDATES</Text>
          <Text style={styles.title}>What's new in immigration</Text>
        </View>
      </View>

      {topVideo && (
        <View style={styles.videoWrap}>
          <YouTubeVideo
            videoId={topVideo.youtube_id}
            title={topVideo.title}
            lang={topVideo.lang}
            colors={colors}
          />
        </View>
      )}

      {topArticles.map((item, i) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.item, (i > 0 || topVideo) && styles.itemBorder]}
          onPress={() => { lightHaptic(); navigation.navigate('ImmigrationNewsDetail', { item }); }}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <View style={styles.tags}>
            <KindPill kind={item.kind} />
            {mayAffect(item, userCtx) && <MayAffectTag />}
          </View>
          <Text style={styles.headline} numberOfLines={3}>{item.headline}</Text>
          <Text style={styles.meta}>{formatDate(item.published_at)}</Text>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); lightHaptic(); Linking.openURL(item.source_url).catch(() => {}); }}
            activeOpacity={0.7}
            accessibilityRole="link"
            style={styles.sourceLink}
          >
            <Ionicons name="open-outline" size={12} color={colors.primary} />
            <Text style={[styles.sourceLinkTxt, { color: colors.primary }]}>{SOURCE_LABEL[item.source] ?? 'Official source'}</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>General information, not legal advice.</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.all, { borderColor: colors.primary }]}
        onPress={() => { lightHaptic(); navigation.navigate('ImmigrationNews'); }}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={[styles.allTxt, { color: colors.primary }]}>See all news</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card:     { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 24, padding: 18, gap: 4, ...SHADOWS.small },
  hdr:      { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  icon:     { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  eyebrow:  { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title:    { fontFamily: TYPOGRAPHY.headingFamily, fontSize: 19, color: '#1A1A2E', marginTop: 2 },
  videoWrap:  { marginTop: 10, marginBottom: 4 },
  item:     { paddingVertical: 12, gap: 6 },
  itemBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  tags:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  headline: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: 17, color: '#1A1A2E', lineHeight: 22 },
  meta:     { fontSize: 13, color: '#7F8C8D' },
  sourceLink:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start' },
  sourceLinkTxt: { fontSize: 12.5, fontWeight: '800' },
  disclaimer:    { fontSize: 11, color: '#9AA0A6', marginTop: 3 },
  all:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, height: 46, marginTop: 8 },
  allTxt:   { fontSize: 15, fontWeight: '800' },
});
