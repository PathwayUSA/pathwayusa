import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useLanguage } from '../i18n';
import { supabase } from '../lib/supabase';
import { SHADOWS } from '../theme';
import { lightHaptic } from '../utils/haptics';
import { BADGE_DEFS } from '../lib/badges';

const NOTIF_READ_KEY = '@pathwayusa/notifications_read_ids';

const TABS = ['notif_all', 'notif_reminders', 'notif_updates'];
const TAB_TYPES = [null, 'reminder', 'update'];

const REMINDER_STYLE = { icon: 'notifications', color: '#E67E22', bg: '#FFF4E0' };
const INACTIVITY_STYLE = { icon: 'map', color: '#27AE60', bg: '#EAF7EE' };

// Same 14-day threshold used for the scheduled push in lib/notifications.js —
// keep the in-app nudge and the push reminder agreeing on what "inactive" means.
const INACTIVITY_DAYS = 14;
const DEADLINE_WINDOW_DAYS = 30;
const DOC_EXPIRY_WINDOW_DAYS = 90;

function daysUntil(iso) {
  return Math.ceil((new Date(iso + 'T12:00:00') - new Date()) / 86400000);
}

function dueLabel(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  if (days === -1) return 'yesterday';
  return `${Math.abs(days)} days ago`;
}

// Builds the live notification list from data that already exists elsewhere in
// the app (deadlines, document expiry, badges, last activity) — no separate
// notifications table, nothing persisted beyond which ids the user has read.
async function computeNotifications({ user, profile, isPro }) {
  const items = [];

  const { data: deadlines } = await supabase
    .from('user_deadlines')
    .select('*')
    .eq('user_id', user.id);

  for (const dl of (deadlines ?? [])) {
    const days = daysUntil(dl.deadline_date);
    if (days < 0 || days > DEADLINE_WINDOW_DAYS) continue;
    items.push({
      id: `deadline-${dl.id}`,
      type: 'reminder',
      sortDays: days,
      ...REMINDER_STYLE,
      title: dl.title,
      body: `"${dl.title}" is due ${dueLabel(days)}. Tap to view your deadlines.`,
      timestamp: `Due ${dueLabel(days)}`,
      screen: 'Deadlines',
    });
  }

  if (isPro) {
    const { data: docExpiry } = await supabase
      .from('document_expiry')
      .select('*')
      .eq('user_id', user.id);

    for (const rec of (docExpiry ?? [])) {
      const days = daysUntil(rec.expiry_date);
      if (days > DOC_EXPIRY_WINDOW_DAYS) continue;
      const expired = days < 0;
      items.push({
        id: `docexpiry-${rec.id}`,
        type: 'reminder',
        sortDays: days,
        ...REMINDER_STYLE,
        title: expired ? `${rec.doc_name} Expired` : `${rec.doc_name} Expiring Soon`,
        body: expired
          ? `Your ${rec.doc_name} expired ${dueLabel(days)}. Renew as soon as possible.`
          : `Your ${rec.doc_name} expires ${dueLabel(days)}. Start renewing now if needed.`,
        timestamp: expired ? `Expired ${dueLabel(days)}` : `Expires ${dueLabel(days)}`,
        screen: 'DocumentExpiry',
      });
    }
  }

  items.sort((a, b) => a.sortDays - b.sortDays);

  if (profile?.last_step_action_at) {
    const daysSince = Math.floor((Date.now() - new Date(profile.last_step_action_at)) / 86400000);
    if (daysSince >= INACTIVITY_DAYS) {
      items.push({
        id: 'inactivity',
        type: 'reminder',
        ...INACTIVITY_STYLE,
        title: 'Continue Your Journey',
        body: `You haven't made progress in ${daysSince} days. Tap to pick up where you left off.`,
        timestamp: `${daysSince} days inactive`,
        screen: 'Guide',
      });
    }
  }

  const earnedBadges = profile?.badges ?? [];
  for (const badgeId of earnedBadges) {
    const badge = BADGE_DEFS.find((b) => b.id === badgeId);
    if (!badge) continue;
    items.push({
      id: `badge-${badge.id}`,
      type: 'update',
      icon: badge.icon,
      color: badge.color,
      bg: badge.color + '20',
      title: `New Badge: ${badge.name}`,
      body: badge.desc,
      timestamp: 'Achievement unlocked',
      screen: 'Badges',
    });
  }

  return items;
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { isPro } = useSubscription();
  const styles = makeStyles(colors);

  const [activeTab, setActiveTab] = useState(0);
  const [readIds, setReadIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_READ_KEY)
      .then((raw) => { if (raw) setReadIds(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    computeNotifications({ user, profile, isPro })
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, [user, profile, isPro]);

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
    const all = notifications.map((n) => n.id);
    setReadIds(all);
    await AsyncStorage.setItem(NOTIF_READ_KEY, JSON.stringify(all)).catch(() => {});
  }, [notifications]);

  const handlePress = useCallback((notif) => {
    lightHaptic();
    markRead(notif.id);
    if (notif.screen) navigation.navigate(notif.screen);
  }, [markRead, navigation]);

  const typeFilter = TAB_TYPES[activeTab];
  const visible = typeFilter
    ? notifications.filter((n) => n.type === typeFilter)
    : notifications;

  const unread = Math.max(0, notifications.length - readIds.filter((id) => notifications.some((n) => n.id === id)).length);

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
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : visible.length === 0 ? (
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
