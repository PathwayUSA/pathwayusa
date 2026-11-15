import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS, TYPOGRAPHY } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { lightHaptic } from '../../utils/haptics';
import { fetchAdminNews, setNewsStatus, formatDate } from '../../lib/news';
import { KindPill } from '../../components/NewsHomeCard';

// Admin-only (enforced by the database, not just this screen): new updates
// land here as Hidden and wait for a tap on Publish before anyone sees them.
export default function NewsReviewScreen({ navigation }) {
  const { colors } = useTheme();
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => setItems(await fetchAdminNews()), []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (item) => {
    lightHaptic(); setBusy(item.id);
    await setNewsStatus(item.id, item.status === 'published' ? 'hidden' : 'published');
    await load(); setBusy(null);
  };

  if (!items) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
      data={items}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListHeaderComponent={<Text style={styles.intro}>New updates from official sources wait here for review — nothing goes live until you tap Publish. Items the safety check flagged show a reason below the date.</Text>}
      ListEmptyComponent={<Text style={styles.intro}>No updates yet.</Text>}
      renderItem={({ item }) => (
        <View style={[styles.card, item.status === 'hidden' && { opacity: 0.7 }]}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {item.kind ? <KindPill kind={item.kind} /> : null}
            <Text style={[styles.status, { color: item.status === 'published' ? '#067647' : '#B42318' }]}>
              {item.status === 'published' ? 'LIVE' : 'HIDDEN'}
            </Text>
            {item.flags.length > 0 && (
              <Text style={styles.flags}>⚑ {item.flags.length} report{item.flags.length === 1 ? '' : 's'}</Text>
            )}
          </View>
          <Text style={styles.headline}>{item.headline || item.source_title}</Text>
          <Text style={styles.meta}>{formatDate(item.published_at)}{item.hidden_reason ? ` · ${item.hidden_reason}` : ''}</Text>
          {item.flags.filter((f) => f.reason).slice(0, 3).map((f, i) => (
            <Text key={i} style={styles.flagReason}>“{f.reason}”</Text>
          ))}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity style={[styles.btn, { borderColor: colors.primary }]} onPress={() => navigation.navigate('ImmigrationNewsDetail', { item })}>
              <Text style={[styles.btnTxt, { color: colors.primary }]}>Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: item.status === 'published' ? '#B42318' : '#067647', borderColor: 'transparent' }]}
              onPress={() => toggle(item)}
              disabled={busy === item.id}
            >
              {busy === item.id ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name={item.status === 'published' ? 'eye-off' : 'eye'} size={16} color="#fff" />
                  <Text style={[styles.btnTxt, { color: '#fff' }]}>{item.status === 'published' ? 'Hide' : 'Publish'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro:      { fontSize: 14.5, color: '#5F6B6D', lineHeight: 21, marginBottom: 4 },
  card:       { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 6, ...SHADOWS.small },
  status:     { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  flags:      { fontSize: 12, fontWeight: '800', color: '#B45309' },
  flagReason: { fontSize: 13, color: '#5F6B6D', fontStyle: 'italic' },
  headline:   { fontFamily: TYPOGRAPHY.headingFamily, fontSize: 16.5, color: '#1A1A2E' },
  meta:       { fontSize: 12.5, color: '#7F8C8D' },
  btn:        { flex: 1, flexDirection: 'row', gap: 6, height: 42, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btnTxt:     { fontSize: 14, fontWeight: '800' },
});
