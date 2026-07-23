import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { SHADOWS } from '../theme';
import {
  registerForPushNotifications,
  scheduleDeadlineNotifications,
  cancelDeadlineNotifications,
} from '../lib/notifications';

// SQL migration required for reminder_enabled column:
// ALTER TABLE user_deadlines ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT true;

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function daysUntil(iso) {
  return Math.ceil((new Date(iso + 'T12:00:00') - new Date()) / 86400000);
}

function urgencyColor(days) {
  if (days > 60) return '#27AE60';
  if (days > 30) return '#E67E22';
  return '#E74C3C';
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background ?? '#F5F7F5' },
    content:   { padding: 16, paddingBottom: 48 },

    // TPS suggestion banner
    tpsBanner: {
      backgroundColor: '#FFF8E7', borderRadius: 16, padding: 16, marginBottom: 16,
      borderLeftWidth: 4, borderLeftColor: '#E67E22', gap: 10,
    },
    tpsBannerTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
    tpsBannerSub:   { fontSize: 13, color: '#7F8C8D', lineHeight: 19 },
    tpsBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: '#E67E22', paddingHorizontal: 14, paddingVertical: 9,
      borderRadius: 10, marginTop: 4,
    },
    tpsBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },

    // Permission banner
    permBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: '#fff3e0', borderRadius: 12, padding: 12, marginBottom: 16,
    },
    permText: { flex: 1, fontSize: 13, color: '#e65100', fontWeight: '500', lineHeight: 17 },

    // Empty state
    emptyBox:   { alignItems: 'center', paddingVertical: 56 },
    emptyIcon:  { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text ?? '#1A1A2E', marginBottom: 6 },
    emptySub:   { fontSize: 14, color: '#7F8C8D', textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },

    // Deadline card
    card: {
      backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
      ...SHADOWS.small, borderLeftWidth: 4,
    },
    cardTopRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    cardBody:     { flex: 1 },
    cardTitle:    { fontSize: 16, fontWeight: '700', color: colors.text ?? '#1A1A2E', marginBottom: 3 },
    cardDate:     { fontSize: 13, color: '#7F8C8D', marginBottom: 6 },
    daysBadge:    { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    daysText:     { fontSize: 12, fontWeight: '700' },
    cardActions:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F5F7F5' },
    reminderRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reminderTxt:  { fontSize: 12, fontWeight: '600', color: '#7F8C8D' },
    deleteBtn:    { padding: 4 },

    // Add button
    addBtn: {
      backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14, marginBottom: 20,
    },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    // Modal / bottom sheet
    overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 20 },
    label:      { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
    input: {
      backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 16,
      paddingVertical: 13, fontSize: 15, color: '#333', marginBottom: 16,
    },
    sheetBtns:      { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn:      { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#f0f0f0' },
    cancelBtnText:  { fontWeight: '700', color: '#666' },
    saveBtn:        { flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.primary },
    saveBtnText:    { fontWeight: '800', color: '#fff' },

    sectionTitle: {
      fontSize: 11, fontWeight: '700', color: '#7F8C8D', letterSpacing: 0.8,
      marginBottom: 10, marginTop: 4, textTransform: 'uppercase',
    },
  });
}

export default function DeadlinesScreen({ navigation }) {
  const { colors }            = useTheme();
  const { user, profile }     = useAuth();
  const insets                = useSafeAreaInsets();
  const styles                = useMemo(() => makeStyles(colors), [colors]);

  const [deadlines, setDeadlines]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [hasPermission, setHasPermission] = useState(true);
  const [modalVisible, setModalVisible]   = useState(false);
  const [title, setTitle]                 = useState('');
  const [dateStr, setDateStr]             = useState('');
  const [saving, setSaving]               = useState(false);
  const [tpsDismissed, setTpsDismissed]  = useState(false);

  // Detect TPS users to show the pre-populated suggestion
  const isTpsUser = (profile?.immigration_status ?? '').toLowerCase().includes('tps');
  const hasUnscheduledTpsHint = isTpsUser && !tpsDismissed &&
    !deadlines.some((d) => d.title?.toLowerCase().includes('tps'));

  const loadDeadlines = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_deadlines')
      .select('*')
      .eq('user_id', user.id)
      .order('deadline_date', { ascending: true });
    setDeadlines(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadDeadlines();
    registerForPushNotifications().then((ok) => setHasPermission(!!ok));
  }, [loadDeadlines]);

  const openModal = (prefillTitle = '') => {
    setTitle(prefillTitle);
    setDateStr('');
    setModalVisible(true);
  };

  const saveDeadline = async () => {
    const trimTitle = title.trim();
    if (!trimTitle) return Alert.alert('Missing name', 'Please enter a deadline name.');
    const parsed = new Date(dateStr.trim() + 'T12:00:00');
    if (isNaN(parsed.getTime())) return Alert.alert('Invalid date', 'Use the format YYYY-MM-DD (e.g. 2026-12-31).');
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('user_deadlines')
      .insert({
        user_id: user.id,
        title: trimTitle,
        deadline_date: parsed.toISOString().split('T')[0],
        reminder_enabled: true,
      })
      .select()
      .single();
    if (error) { Alert.alert('Error', error.message); setSaving(false); return; }
    if (hasPermission && data) await scheduleDeadlineNotifications(data);
    setDeadlines((prev) =>
      [...prev, data].sort((a, b) => new Date(a.deadline_date) - new Date(b.deadline_date))
    );
    setSaving(false);
    setModalVisible(false);
  };

  const toggleReminder = async (dl) => {
    const next = !(dl.reminder_enabled ?? true);
    // Optimistic update
    setDeadlines((prev) => prev.map((d) => d.id === dl.id ? { ...d, reminder_enabled: next } : d));
    if (next) {
      if (hasPermission) await scheduleDeadlineNotifications({ ...dl, reminder_enabled: true });
    } else {
      await cancelDeadlineNotifications(dl.id);
    }
    supabase.from('user_deadlines').update({ reminder_enabled: next }).eq('id', dl.id).catch(() => {});
  };

  const deleteDeadline = (dl) => {
    Alert.alert('Delete Deadline', `Remove "${dl.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await cancelDeadlineNotifications(dl.id);
          await supabase.from('user_deadlines').delete().eq('id', dl.id);
          setDeadlines((prev) => prev.filter((d) => d.id !== dl.id));
        },
      },
    ]);
  };

  const upcoming = deadlines.filter((d) => daysUntil(d.deadline_date) >= 0);
  const past     = deadlines.filter((d) => daysUntil(d.deadline_date) < 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* TPS pre-populated suggestion */}
        {hasUnscheduledTpsHint && (
          <View style={styles.tpsBanner}>
            <Text style={styles.tpsBannerTitle}>📅 TPS Re-registration Reminder</Text>
            <Text style={styles.tpsBannerSub}>
              TPS holders should track their re-registration deadline. Add a reminder so you never miss it.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.tpsBtn}
                onPress={() => { setTpsDismissed(false); openModal('TPS Re-registration'); }}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={15} color="#fff" />
                <Text style={styles.tpsBtnTxt}>Add TPS Reminder</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTpsDismissed(true)} activeOpacity={0.7}>
                <Text style={{ fontSize: 13, color: '#BDC3C7' }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Notifications off banner */}
        {!hasPermission && (
          <View style={styles.permBanner}>
            <Ionicons name="notifications-off-outline" size={20} color="#e65100" />
            <Text style={styles.permText}>
              Notifications are off. Enable them in Settings to get reminders before deadlines.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Deadline</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : deadlines.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No Deadlines Yet</Text>
            <Text style={styles.emptySub}>
              Add filing deadlines, renewal dates, or court appearances. We'll remind you 30, 7, and 1 day before each one.
            </Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {upcoming.map((dl) => {
                  const days = daysUntil(dl.deadline_date);
                  const uc   = urgencyColor(days);
                  const reminderOn = dl.reminder_enabled ?? true;
                  return (
                    <View key={dl.id} style={[styles.card, { borderLeftColor: uc }]}>
                      <View style={styles.cardTopRow}>
                        <View style={styles.cardBody}>
                          <Text style={styles.cardTitle}>{dl.title}</Text>
                          <Text style={styles.cardDate}>{formatDate(dl.deadline_date)}</Text>
                          <View style={[styles.daysBadge, { backgroundColor: uc + '18' }]}>
                            <Text style={[styles.daysText, { color: uc }]}>
                              {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDeadline(dl)}>
                          <Ionicons name="trash-outline" size={18} color="#BDC3C7" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.cardActions}>
                        <View style={styles.reminderRow}>
                          <Ionicons
                            name={reminderOn ? 'notifications' : 'notifications-off-outline'}
                            size={14}
                            color={reminderOn ? colors.primary : '#BDC3C7'}
                          />
                          <Text style={styles.reminderTxt}>
                            {reminderOn ? 'Reminders on' : 'Reminders off'}
                          </Text>
                        </View>
                        <Switch
                          value={reminderOn}
                          onValueChange={() => toggleReminder(dl)}
                          trackColor={{ false: '#E8ECE8', true: colors.primary + '50' }}
                          thumbColor={reminderOn ? colors.primary : '#BDC3C7'}
                          ios_backgroundColor="#E8ECE8"
                        />
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {past.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Past</Text>
                {past.map((dl) => (
                  <View key={dl.id} style={[styles.card, { opacity: 0.5, borderLeftColor: '#BDC3C7' }]}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{dl.title}</Text>
                        <Text style={styles.cardDate}>{formatDate(dl.deadline_date)}</Text>
                      </View>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDeadline(dl)}>
                        <Ionicons name="trash-outline" size={18} color="#BDC3C7" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Deadline Bottom Sheet */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.sheetTitle}>New Deadline</Text>
            <Text style={styles.label}>What is this deadline for?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., TPS Re-registration, N-400 Filing"
              placeholderTextColor="#BDC3C7"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              autoFocus
            />
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2026-09-30"
              placeholderTextColor="#BDC3C7"
              value={dateStr}
              onChangeText={setDateStr}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={{ fontSize: 12, color: '#BDC3C7', marginTop: -10, marginBottom: 16 }}>
              You'll get reminders 30, 7, and 1 day before this date.
            </Text>
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveDeadline} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save & Remind Me</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
