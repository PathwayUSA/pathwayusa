import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { SHADOWS } from '../../theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function relTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const AVATAR_COLORS = ['#0F2A3D', '#1A3F5C', '#1D5C73', '#236B7E', '#1E6B5E', '#2A8B7A'];
function avatarColor(name) {
  let h = 0;
  for (const c of (name ?? 'A')) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    safe:      { flex: 1, backgroundColor: colors.primary },
    container: { flex: 1, backgroundColor: colors.background },
    header:    { backgroundColor: colors.primary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTxt: { fontSize: 20, fontWeight: '900', color: '#fff', flex: 1 },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

    list:      { paddingTop: 8, paddingBottom: 20 },
    row:       { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    rowUnread: { backgroundColor: '#f8fdff' },
    avatar:    { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    avatarTxt: { fontSize: 18, fontWeight: '900', color: '#fff' },
    info:      { flex: 1, gap: 3 },
    nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name:      { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
    nameUnread:{ fontWeight: '900' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    preview:   { fontSize: 13, color: '#888', lineHeight: 18 },
    previewUnread:{ color: '#1a1a2e', fontWeight: '600' },
    timeCol:   { alignItems: 'flex-end', gap: 6 },
    timeTxt:   { fontSize: 12, color: '#aaa' },
    badge:     { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
    badgeTxt:  { fontSize: 11, fontWeight: '800', color: '#fff' },
    chevron:   { marginLeft: 4 },

    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 14 },
    emptyTxt:  { fontSize: 15, color: '#aaa', textAlign: 'center', lineHeight: 22 },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttorneyMessagesScreen({ navigation }) {
  const { user }   = useAuth();
  const { colors } = useTheme();
  const styles     = useMemo(() => makeStyles(colors), [colors]);

  const [convos, setConvos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;

    // Get all linked clients
    const { data: links } = await supabase
      .from('attorney_clients')
      .select('client_id, profiles!attorney_clients_client_id_fkey(id, full_name, country)')
      .eq('attorney_id', user.id);

    if (!links?.length) { setConvos([]); setLoading(false); setRefreshing(false); return; }

    const ids = links.map((l) => l.client_id);

    // Get all messages involving attorney + these clients
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, from_id, to_id, content, read, created_at')
      .or(`and(from_id.in.(${ids.join(',')}),to_id.eq.${user.id}),and(from_id.eq.${user.id},to_id.in.(${ids.join(',')}))`)
      .order('created_at', { ascending: false });

    // Build conversation map per client
    const convoMap = {};
    for (const link of links) {
      const profile = link.profiles ?? {};
      convoMap[profile.id] = {
        client: profile,
        lastMsg: null,
        lastTime: null,
        unread: 0,
      };
    }

    for (const msg of (msgs ?? [])) {
      const otherId = msg.from_id === user.id ? msg.to_id : msg.from_id;
      if (!convoMap[otherId]) continue;
      if (!convoMap[otherId].lastMsg) {
        convoMap[otherId].lastMsg  = msg.content;
        convoMap[otherId].lastTime = msg.created_at;
      }
      if (msg.from_id !== user.id && !msg.read) {
        convoMap[otherId].unread++;
      }
    }

    const list = Object.values(convoMap).sort((a, b) => {
      if (!a.lastTime && !b.lastTime) return 0;
      if (!a.lastTime) return 1;
      if (!b.lastTime) return -1;
      return new Date(b.lastTime) - new Date(a.lastTime);
    });

    setConvos(list);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`att_msgs_screen_${user?.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_id=eq.${user?.id}` },
        () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load, user]);

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTxt}>Messages</Text>
            <Text style={styles.headerSub}>
              {convos.reduce((s, c) => s + c.unread, 0)} unread · {convos.length} conversation{convos.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Ionicons name="chatbubbles" size={24} color="rgba(255,255,255,0.6)" />
        </View>

        {loading ? (
          <View style={styles.emptyWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : convos.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={56} color="#ddd" />
            <Text style={styles.emptyTxt}>No conversations yet.{'\n'}Start messaging your clients from their profile.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
          >
            {convos.map((c) => {
              const hasUnread = c.unread > 0;
              const ac = avatarColor(c.client.full_name);
              return (
                <TouchableOpacity
                  key={c.client.id}
                  style={[styles.row, hasUnread && styles.rowUnread]}
                  onPress={() => navigation.navigate('AttClientDetail', { client: c.client, initialTab: 'messages' })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.avatar, { backgroundColor: ac }]}>
                    <Text style={styles.avatarTxt}>{initials(c.client.full_name)}</Text>
                  </View>

                  <View style={styles.info}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, hasUnread && styles.nameUnread]}>
                        {c.client.full_name ?? 'Client'}
                      </Text>
                      {hasUnread && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
                      {c.lastMsg ?? 'No messages yet — tap to start a conversation'}
                    </Text>
                  </View>

                  <View style={styles.timeCol}>
                    <Text style={styles.timeTxt}>{relTime(c.lastTime)}</Text>
                    {c.unread > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeTxt}>{c.unread > 99 ? '99+' : c.unread}</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#ccc" style={styles.chevron} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
