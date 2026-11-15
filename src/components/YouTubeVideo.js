import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY } from '../theme';
import { lightHaptic } from '../utils/haptics';

// Plays an official YouTube video right inside the app.
// Shows the real thumbnail first; the player loads only after a tap, so
// pages stay fast and nothing plays on its own.

const isValidId = (id) => /^[A-Za-z0-9_-]{11}$/.test(id ?? '');
export const thumbUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

function Player({ id }) {
  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      src: embedUrl(id),
      style: { width: '100%', height: '100%', border: 0 },
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      allowFullScreen: true,
      title: 'Official video',
    });
  }
  const { WebView } = require('react-native-webview');
  return (
    <WebView
      source={{ uri: embedUrl(id) }}
      style={{ flex: 1, backgroundColor: '#000' }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo
      javaScriptEnabled
      // Keep the player on YouTube's video page only.
      originWhitelist={['https://www.youtube-nocookie.com', 'https://www.youtube.com']}
      setSupportMultipleWindows={false}
    />
  );
}

export default function YouTubeVideo({ videoId, title, lang, colors }) {
  const [playing, setPlaying] = useState(false);
  if (!isValidId(videoId)) return null;

  return (
    <View style={styles.card}>
      <View style={styles.frame}>
        {playing ? <Player id={videoId} /> : (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => { lightHaptic(); setPlaying(true); }}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={`Play video: ${title ?? 'official video'}`}
          >
            <Image source={{ uri: thumbUrl(videoId) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.shade} />
            <View style={styles.badge}><Text style={[styles.badgeTxt, { color: colors.primaryDark }]}>OFFICIAL VIDEO</Text></View>
            <View style={styles.play}><Ionicons name="play" size={34} color={colors.primary} style={{ marginLeft: 4 }} /></View>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.meta}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{title ?? 'Watch the explainer'}</Text>
          <Text style={styles.sub}>From an official government channel</Text>
        </View>
        {lang ? <Text style={styles.lang}>{String(lang).toUpperCase()}</Text> : null}
      </View>
    </View>
  );
}

/** Small thumbnail with a play icon, for lists and the Home card. */
export function VideoThumb({ videoId, width = 112, height = 64 }) {
  if (!isValidId(videoId)) return null;
  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0F766E' }}>
      <Image source={{ uri: thumbUrl(videoId) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[styles.shade, { opacity: 0.25 }]} />
      <View style={[styles.play, { width: 30, height: 30, borderRadius: 15, marginLeft: -15, marginTop: -15 }]}>
        <Ionicons name="play" size={15} color="#0B8579" style={{ marginLeft: 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  frame:   { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#0F766E' },
  shade:   { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', opacity: 0.18 },
  badge:   { position: 'absolute', left: 12, top: 12, backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:{ fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  play:    { position: 'absolute', left: '50%', top: '50%', width: 68, height: 68, borderRadius: 34, marginLeft: -34, marginTop: -34, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  meta:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  title:   { fontFamily: TYPOGRAPHY.headingFamily, fontSize: 16, color: '#1A1A2E' },
  sub:     { fontSize: 12.5, color: '#7F8C8D', marginTop: 2 },
  lang:    { fontSize: 11, fontWeight: '800', color: '#5F6B6D', backgroundColor: '#F0F1F3', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
});
