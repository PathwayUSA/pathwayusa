// TODO: Replace static notifications with Supabase real-time subscription
// to user_notifications table.
// Schema: { id, user_id, type, title, body, read, created_at, screen }
// Use supabase.channel('notifications').on('postgres_changes', ...) for live updates.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import { SHADOWS } from '../theme';
import { lightHaptic } from '../utils/haptics';

export const NOTIF_READ_KEY = '@pathwayusa/notifications_read_ids';

const TABS = ['notif_all', 'notif_reminders', 'notif_news', 'notif_updates'];
const TAB_TYPES = [null, 'reminder', 'news', 'update'];

const STATIC_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'reminder',
    icon: 'notifications',
    color: '#E67E22',
    bg: '#FFF4E0',
    title: 'TPS Renewal Reminder',
    body: 'Check renewal deadlines at uscis.gov. File Form I-821 before your status expires.',
    timestamp: '2h ago',
    screen: 'Guide',
  },
  {
    id: 'n2',
    type: 'reminder',
    icon: 'document-text',
    color: '#E67E22',
    bg: '#FFF4E0',
    title: 'N-400 Deadline',
    body: 'Your application window is approaching. Complete Form N-400 soon.',
    timestamp: '1d ago',
    screen: 'Guide',
  },
  {
    id: 'n3',
    type: 'reminder',
    icon: 'map',
    color: '#27AE60',
    bg: '#EAF7EE',
    title: 'Continue Your Journey',
    body: "You haven't completed a step in 3 days. Tap to pick up where you left off.",
    timestamp: '3d ago',
    screen: 'Guide',
  },
  {
    id: 'n4',
    type: 'reminder',
    icon: 'flame',
    color: '#F5A623',
    bg: '#FFF4E0',
    title: 'Daily Challenge',
    body: "Complete today's quiz to keep your momentum going.",
    timestamp: '8h ago',
    screen: 'Home',
  },
  {
    id: 'n5',
    type: 'news',
    icon: 'newspaper',
    color: '#1976d2',
    bg: '#E3F2FD',
    title: 'Policy Update',
    body: 'New TPS designation announced for select countries. Check if you qualify.',
    timestamp: '2d ago',
    screen: null,
  },
  {
    id: 'n6',
    type: 'update',
    icon: 'sparkles',
    color: '#27AE60',
    bg: '#EAF7EE',
    title: 'New Feature Available',
    body: 'Travel Tracker is now available for Green Card holders. Track trips to avoid abandonment.',
    timestamp: '1w ago',
    screen: 'TravelTracker',
  },
];

export function getUnreadCount(readIds) {
  return Math.max(0, STATIC_NOTIFICATIONS.length - readIds.length);
}

export async function loadUnreadCount() {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_READ_KEY);
    const readIds = raw ? JSON.parse(raw) : [];
    return getUnreadCount(readIds);
  } catch {
    return 0;
  }
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = makeStyles(colors);

  const [activeTab, setActiveTab] = useState(0);
  const [readIds, setReadIds] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_READ_KEY)
      .then((raw) => { if (raw) setReadIds(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const markRead = useCallback(async (id) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(NOTIF_READ_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const markAllRead = useCallback(async () => {
    lightHaptic();
    const all = STATIC_NOTIFICATIONS.map((n) => n.id);
    setReadIds(all);
    await AsyncStorage.setItem(NOTIF_READ_KEY, JSON.stringify(all)).catch(() => {});
  }, []);

  const handlePress = useCallback((notif) => {
    lightHaptic();
    markRead(notif.id);
    if (notif.screen) navigation.navigate(notif.screen);
  }, [markRead, navigation]);

  const typeFilter = TAB_TYPES[activeTab];
  const visible = typeFilter
    ? STATIC_NOTIFICATIONS.filter((n) => n.type === typeFilter)
    : STATIC_NOTIFICATIONS;

  const unread = getUnreadCount(readIds);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notif_title')}</Text>
        <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn} activeOpacity={0.75}>
          <Text style={[styles.markAllTxt, { color: colors.primary }]}>{t('notif_mark_all_read')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab filters */}
      <View style={styles.tabRow}>
        {TABS.map((key, i) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === i && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
            onPress={() => { lightHaptic(); setActiveTab(i); }}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabTxt, activeTab === i && { color: colors.primary, fontWeight: '800' }]}>
              {t(key)}
            </Text>
            {i === 0 && unread > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.tabBadgeTxt}>{unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {visible.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={52} color="#DDD" />
            <Text style={styles.emptyTitle}>{t('notif_empty_title')}</Text>
            <Text style={styles.emptySub}>{t('notif_empty_sub')}</Text>
          </View>
        ) : (
          visible.map((notif) => {
            const isRead = readIds.includes(notif.id);
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.card, isRead && styles.cardRead]}
                onPress={() => handlePress(notif)}
                activeOpacity={0.8}
              >
                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: notif.bg }]}>
                  <Ionicons name={notif.icon} size={20} color={notif.color} />
                </View>

                {/* Content */}
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, isRead && styles.cardTitleRead]}>
                    {notif.title}
                  </Text>
                  <Text style={styles.cardBody2} numberOfLines={2}>{notif.body}</Text>
                  <Text style={styles.timestamp}>{notif.timestamp}</Text>
                </View>

                {/* Unread dot */}
                {!isRead && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7F5' },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: '#fff',
      ...SHADOWS.small,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '900', color: '#1A1A2E' },
    markAllBtn: { paddingVertical: 6, paddingHorizontal: 4 },
    markAllTxt: { fontSize: 13, fontWeight: '700' },

    tabRow: {
      flexDirection: 'row',
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    tab: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 13, gap: 5,
    },
    tabTxt: { fontSize: 13, fontWeight: '600', color: '#7F8C8D' },
    tabBadge: {
      minWidth: 18, height: 18, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 4,
    },
    tabBadgeTxt: { fontSize: 10, fontWeight: '900', color: '#fff' },

    list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32, gap: 10 },

    card: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 14,
      backgroundColor: '#fff', borderRadius: 16, padding: 16,
      ...SHADOWS.small,
    },
    cardRead: { opacity: 0.72 },
    iconWrap: {
      width: 44, height: 44, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    cardBody: { flex: 1, gap: 4 },
    cardTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', lineHeight: 20 },
    cardTitleRead: { fontWeight: '600', color: '#555' },
    cardBody2: { fontSize: 13, color: '#7F8C8D', lineHeight: 19 },
    timestamp: { fontSize: 11, color: '#BDC3C7', marginTop: 2 },
    unreadDot: { width: 9, height: 9, borderRadius: 5, marginTop: 6, flexShrink: 0 },

    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1A1A2E' },
    emptySub: { fontSize: 14, color: '#7F8C8D', textAlign: 'center', lineHeight: 21, paddingHorizontal: 32 },
  });
}
