import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DragHandle from '../components/DragHandle';

export const TRAVEL_STATS_KEY = '@pathwayusa/travel_stats_v1';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(isoA, isoB) {
  return Math.max(0, Math.floor(
    (new Date(isoB + 'T00:00:00') - new Date(isoA + 'T00:00:00')) / 86400000,
  ));
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

function autoFmtDate(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDate(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    const mm = digits.slice(0, 2), dd = digits.slice(2, 4), yyyy = digits.slice(4);
    const iso = `${yyyy}-${mm}-${dd}`;
    if (!isNaN(new Date(iso + 'T00:00:00').getTime())) return iso;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && !isNaN(new Date(raw + 'T00:00:00').getTime())) return raw;
  return null;
}

function tripDays(trip) {
  return daysBetween(trip.departure_date, trip.return_date ?? todayStr());
}

function calcStats(gcDate, pathYears, trips) {
  if (!gcDate) return null;
  const required   = pathYears === 3 ? 548 : 913;
  const td         = daysBetween(gcDate, todayStr());
  const abroad     = trips.reduce((s, t) => s + tripDays(t), 0);
  const inUS       = Math.max(0, td - abroad);
  const hasOver180 = trips.some((t) => tripDays(t) > 180);
  const hasOver150 = trips.some((t) => tripDays(t) > 150 && tripDays(t) <= 180);
  const longestTripDays = trips.reduce((max, t) => Math.max(max, tripDays(t)), 0);
  const current    = trips.find((t) => !t.return_date) ?? null;
  const currentDays = current ? daysBetween(current.departure_date, todayStr()) : 0;
  const pct        = Math.min(1, inUS / required);
  const stillNeeded = Math.max(0, required - inUS);
  const eligDate   = new Date(Date.now() + stillNeeded * 86400000)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { td, abroad, inUS, hasOver180, hasOver150, longestTripDays, current, currentDays, pct, required, stillNeeded, eligDate };
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f9f9fc' },

    statsHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
    headerLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5, marginBottom: 18 },
    statsRow: { flexDirection: 'row', marginBottom: 22 },
    statBox: { flex: 1, alignItems: 'center' },
    statBig: { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 4 },
    statLbl: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
    statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 8 },

    progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    progressPct: { fontSize: 13, fontWeight: '700', color: '#fff' },
    progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressBarFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
    progressSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },

    warnBannerRed: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#c62828', padding: 14, paddingHorizontal: 20 },
    warnBannerYellow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF8E1', padding: 14, paddingHorizontal: 20 },
    warnBannerTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff', lineHeight: 20 },

    tripsSection: { paddingHorizontal: 16, paddingTop: 20 },
    tripsSectionHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    tripsSectionTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, color: '#1a1a2e' },
    logBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minHeight: 42 },
    logBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

    tripCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, ...SHADOWS.small },
    tripLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    tripIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    tripInfo: { flex: 1 },
    tripDest: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 3 },
    tripDates: { fontSize: 13, color: '#888', lineHeight: 18 },
    tripRight: { alignItems: 'flex-end', gap: 4 },
    tripDays: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' },
    tripWarnLabel: { fontSize: 9, fontWeight: '900', color: '#fff', backgroundColor: '#e53935', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, letterSpacing: 0.5 },
    deleteBtn: { padding: 4, marginTop: 2 },

    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#888' },
    emptySub: { fontSize: 15, color: '#bbb', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },

    rulesCard: { marginHorizontal: 16, marginTop: 24, backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 12, ...SHADOWS.small },
    rulesTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e' },
    ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    ruleText: { flex: 1, fontSize: 14, color: '#555', lineHeight: 20 },

    changeSetupBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 16, marginTop: 8 },
    changeSetupTxt: { fontSize: 14, color: '#bbb', fontWeight: '600' },

    // Setup page
    setupRoot: { flex: 1, backgroundColor: '#f9f9fc', padding: 20, justifyContent: 'center' },
    setupCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, gap: 14, ...SHADOWS.medium },
    setupIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primaryLight ?? '#e0faf5', justifyContent: 'center', alignItems: 'center' },
    setupTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#1a1a2e', lineHeight: TYPOGRAPHY.displayLineHeight },
    setupSub: { fontSize: 15, color: '#666', lineHeight: 23, marginBottom: 4 },

    fieldLabel: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 6 },
    dateInput: { backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '600', color: '#111', letterSpacing: 1, borderWidth: 1.5, borderColor: '#e8e8e8' },
    textInput: { backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111', borderWidth: 1.5, borderColor: '#e8e8e8' },

    pathRow: { flexDirection: 'row', gap: 10 },
    pathBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', gap: 3, backgroundColor: '#fafafa' },
    pathBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pathBtnTxt: { fontSize: 16, fontWeight: '800', color: '#333' },
    pathBtnTxtActive: { color: '#fff' },
    pathBtnSub: { fontSize: 11, color: '#888', textAlign: 'center' },

    saveBtn: { borderRadius: 14, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', minHeight: 58 },
    saveBtnTxt: { fontSize: 17, fontWeight: '800', color: '#fff' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12 },
    modalTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, lineHeight: TYPOGRAPHY.displayLineHeight, color: '#1a1a2e' },
    stillAbroadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
    modalCancelBtn: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 14, paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', minHeight: 58 },
    modalCancelTxt: { fontSize: 16, fontWeight: '700', color: '#666' },
    disclaimer: { fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 16, marginTop: 4 },
  });
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TravelTrackerScreen() {
  const { colors }                       = useTheme();
  const { user, profile, updateProfile } = useAuth();
  const insets                           = useSafeAreaInsets();
  const styles                           = makeStyles(colors);

  const gcDate    = profile?.green_card_date ?? null;
  const pathYears = profile?.gc_path_years   ?? 5;

  const [trips, setTrips]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showLog, setShowLog]     = useState(false);
  const [showEditSetup, setShowEditSetup] = useState(false);

  // Log form
  const [depInput, setDepInput]     = useState('');
  const [retInput, setRetInput]     = useState('');
  const [stillAbroad, setStillAbroad] = useState(false);
  const [destination, setDestination] = useState('');

  // Setup / edit form
  const [gcDateInput, setGcDateInput] = useState('');
  const [gcYears, setGcYears]         = useState(5);

  // ── Load trips ────────────────────────────────────────────────────────────

  const loadTrips = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('travel_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('departure_date', { ascending: false });
    const rows = data ?? [];
    setTrips(rows);
    setLoading(false);
    // Write summary to cache for HomeScreen card
    if (gcDate) {
      const s = calcStats(gcDate, pathYears, rows);
      if (s) {
        AsyncStorage.setItem(TRAVEL_STATS_KEY, JSON.stringify({
          daysInUS: s.inUS, daysAbroad: s.abroad, pct: s.pct,
          tripCount: rows.length, hasWarning: s.hasOver150 || s.hasOver180,
          hasRisk: s.hasOver180, longestTripDays: s.longestTripDays, required: s.required,
        })).catch(() => {});
      }
    }
  }, [user, gcDate, pathYears]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  // ── Derived stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => calcStats(gcDate, pathYears, trips), [gcDate, pathYears, trips]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openEditSetup = useCallback(() => {
    if (gcDate) {
      const [y, m, d] = gcDate.split('-');
      setGcDateInput(`${m}/${d}/${y}`);
    } else {
      setGcDateInput('');
    }
    setGcYears(pathYears);
    setShowEditSetup(true);
  }, [gcDate, pathYears]);

  const handleSaveSetup = async () => {
    const parsed = parseDate(gcDateInput);
    if (!parsed) {
      Alert.alert('Invalid date', 'Enter your green card date as MM/DD/YYYY.'); return;
    }
    if (parsed > todayStr()) {
      Alert.alert('Invalid date', 'Green card date cannot be in the future.'); return;
    }
    setSaving(true);
    await updateProfile({ green_card_date: parsed, gc_path_years: gcYears });
    setSaving(false);
    setShowEditSetup(false);
  };

  const resetLogForm = () => {
    setDepInput(''); setRetInput(''); setDestination(''); setStillAbroad(false);
  };

  const handleLogTrip = async () => {
    const dep = parseDate(depInput);
    if (!dep) { Alert.alert('Invalid date', 'Enter departure date as MM/DD/YYYY.'); return; }
    if (dep > todayStr()) { Alert.alert('Invalid date', 'Departure date cannot be in the future.'); return; }

    let ret = null;
    if (!stillAbroad) {
      ret = parseDate(retInput);
      if (!ret) { Alert.alert('Invalid date', 'Enter return date as MM/DD/YYYY.'); return; }
      if (ret < dep) { Alert.alert('Invalid', 'Return date must be after departure.'); return; }
    }
    setSaving(true);
    const { error } = await supabase.from('travel_logs').insert({
      user_id: user.id, departure_date: dep, return_date: ret,
      destination: destination.trim() || null,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', 'Could not save. Try again.'); return; }
    setShowLog(false);
    resetLogForm();
    loadTrips();
  };

  const handleDelete = useCallback((trip) => {
    Alert.alert(
      'Delete Trip',
      `Remove trip from ${fmtDate(trip.departure_date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('travel_logs').delete().eq('id', trip.id);
          loadTrips();
        }},
      ],
    );
  }, [loadTrips]);

  // ── Setup page (no gcDate) ────────────────────────────────────────────────

  if (!gcDate) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#f9f9fc' }} contentContainerStyle={styles.setupRoot}>
        <View style={styles.setupCard}>
          <View style={styles.setupIconWrap}>
            <Ionicons name="airplane" size={28} color={colors.primary} />
          </View>
          <Text style={styles.setupTitle}>Set Up Travel Tracker</Text>
          <Text style={styles.setupSub}>
            Enter your green card approval date to track your continuous residence for citizenship eligibility.
          </Text>

          <Text style={styles.fieldLabel}>Green Card Approval Date</Text>
          <TextInput
            style={styles.dateInput}
            value={gcDateInput}
            onChangeText={(t) => setGcDateInput(autoFmtDate(t))}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#ccc"
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.fieldLabel}>Path to Citizenship</Text>
          <View style={styles.pathRow}>
            {[{ years: 5, sub: 'Most green cards' }, { years: 3, sub: 'Married to US citizen' }].map(({ years, sub }) => (
              <TouchableOpacity key={years} style={[styles.pathBtn, gcYears === years && styles.pathBtnActive]} onPress={() => setGcYears(years)} activeOpacity={0.85}>
                <Text style={[styles.pathBtnTxt, gcYears === years && styles.pathBtnTxtActive]}>{years}-Year Path</Text>
                <Text style={[styles.pathBtnSub, gcYears === years && { color: 'rgba(255,255,255,0.8)' }]}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveSetup} activeOpacity={0.85} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Start Tracking</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Main tracker ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Stats header */}
        <LinearGradient colors={colors.gradient} style={styles.statsHeader} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}>
          <Text style={styles.headerLabel}>
            {pathYears}-YEAR PATH · GREEN CARD: {fmtDate(gcDate).toUpperCase()}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBig}>{stats?.inUS?.toLocaleString() ?? '—'}</Text>
              <Text style={styles.statLbl}>Days in US</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statBig}>{stats?.abroad?.toLocaleString() ?? '—'}</Text>
              <Text style={styles.statLbl}>Days Abroad</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statBig}>{trips.length}</Text>
              <Text style={styles.statLbl}>Trips</Text>
            </View>
          </View>

          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Continuous Residence</Text>
            <Text style={styles.progressPct}>{stats?.inUS ?? 0} / {stats?.required ?? 913} days</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min((stats?.pct ?? 0) * 100, 100)}%` }]} />
          </View>
          {stats?.stillNeeded > 0 ? (
            <Text style={styles.progressSub}>
              Est. eligible: {stats.eligDate} ({stats.stillNeeded} more days needed)
            </Text>
          ) : (
            <Text style={styles.progressSub}>You may meet the physical presence requirement!</Text>
          )}
        </LinearGradient>

        {/* Warning banners */}
        {stats?.hasOver180 && (
          <View style={styles.warnBannerRed}>
            <Ionicons name="alert-circle" size={20} color="#fff" style={{ flexShrink: 0, marginTop: 1 }} />
            <Text style={styles.warnBannerTxt}>
              A trip exceeded 180 days — this may have broken continuous residence. Consult an immigration attorney before applying.
            </Text>
          </View>
        )}
        {!stats?.hasOver180 && stats?.hasOver150 && (
          <View style={styles.warnBannerYellow}>
            <Ionicons name="warning" size={20} color="#7c3c00" style={{ flexShrink: 0, marginTop: 1 }} />
            <Text style={[styles.warnBannerTxt, { color: '#7c3c00' }]}>
              A trip exceeded 150 days and is approaching the 180-day risk threshold. Plan your return date carefully.
            </Text>
          </View>
        )}
        {stats?.current && stats.currentDays > 150 && (
          <View style={styles.warnBannerYellow}>
            <Ionicons name="warning" size={20} color="#e65100" style={{ flexShrink: 0, marginTop: 1 }} />
            <Text style={[styles.warnBannerTxt, { color: '#e65100' }]}>
              Currently abroad for {stats.currentDays} days — only {180 - stats.currentDays} days until 180-day risk threshold.
            </Text>
          </View>
        )}

        {/* Trips list */}
        <View style={styles.tripsSection}>
          <View style={styles.tripsSectionHdr}>
            <Text style={styles.tripsSectionTitle}>International Trips</Text>
            <TouchableOpacity style={[styles.logBtn, { backgroundColor: colors.primary }]} onPress={() => setShowLog(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.logBtnTxt}>Log Trip</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : trips.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="airplane-outline" size={52} color="#ddd" />
              <Text style={styles.emptyTitle}>No trips logged yet</Text>
              <Text style={styles.emptySub}>Log your international trips to track your continuous residence status accurately.</Text>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary, paddingHorizontal: 28, marginTop: 8 }]}
                onPress={() => setShowLog(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnTxt}>Log Your First Trip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            trips.map((trip) => {
              const days = tripDays(trip);
              const isOver180 = days > 180;
              const isOver150 = days > 150;
              const isOngoing = !trip.return_date;
              return (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripLeft}>
                    <View style={[styles.tripIconWrap, isOver180 && { backgroundColor: '#FFEBEE' }, isOver150 && !isOver180 && { backgroundColor: '#FFF3E0' }]}>
                      <Ionicons
                        name={isOver180 ? 'alert-circle' : isOver150 ? 'warning' : 'airplane'}
                        size={20}
                        color={isOver180 ? '#e53935' : isOver150 ? '#f57c00' : colors.primary}
                      />
                    </View>
                    <View style={styles.tripInfo}>
                      <Text style={styles.tripDest}>{trip.destination || 'International Trip'}</Text>
                      <Text style={styles.tripDates}>
                        {fmtDate(trip.departure_date)} → {isOngoing ? 'Still abroad' : fmtDate(trip.return_date)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tripRight}>
                    <Text style={[styles.tripDays, isOver180 && { color: '#e53935' }, isOver150 && !isOver180 && { color: '#f57c00' }]}>
                      {days}d
                    </Text>
                    {isOver180 && <Text style={styles.tripWarnLabel}>RISK</Text>}
                    {isOngoing && !isOver180 && (
                      <Text style={[styles.tripWarnLabel, { backgroundColor: '#e0f2f1', color: '#00695c' }]}>ABROAD</Text>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(trip)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={16} color="#ccc" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Rules reminder */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Continuous Residence Rules</Text>
          {[
            { icon: 'checkmark-circle', color: '#2e7d32', text: `${pathYears}-year path requires ${pathYears === 3 ? 548 : 913} days physically present in the US before filing` },
            { icon: 'warning', color: '#f57c00', text: 'Any single trip over 180 days can break continuous residence' },
            { icon: 'alert-circle', color: '#c62828', text: 'Any trip over 1 year (365 days) almost certainly breaks continuous residence' },
            { icon: 'information-circle', color: colors.primary, text: 'USCIS may waive breaks for good cause — consult an immigration attorney if you have a long trip' },
          ].map((r, i) => (
            <View key={i} style={styles.ruleRow}>
              <Ionicons name={r.icon} size={17} color={r.color} style={{ marginTop: 2, flexShrink: 0 }} />
              <Text style={styles.ruleText}>{r.text}</Text>
            </View>
          ))}
        </View>

        <Text style={{ textAlign: 'center', fontSize: 11, color: '#bbb', marginHorizontal: 20, marginTop: 16, lineHeight: 16 }}>
          Calculations are estimates. Always verify your eligibility with an immigration attorney. Based on USCIS requirements at uscis.gov.
        </Text>

        <TouchableOpacity style={styles.changeSetupBtn} onPress={openEditSetup} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={14} color="#bbb" />
          <Text style={styles.changeSetupTxt}>Update green card date or path years</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Log Trip Modal ── */}
      <Modal visible={showLog} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <DragHandle />
            <Text style={styles.modalTitle}>Log International Trip</Text>

            <Text style={styles.fieldLabel}>Departure Date</Text>
            <TextInput
              style={styles.dateInput}
              value={depInput}
              onChangeText={(t) => setDepInput(autoFmtDate(t))}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#ccc"
              keyboardType="number-pad"
              maxLength={10}
            />

            <View style={styles.stillAbroadRow}>
              <Text style={styles.fieldLabel}>Currently still abroad?</Text>
              <Switch
                value={stillAbroad}
                onValueChange={setStillAbroad}
                trackColor={{ false: '#e0e0e0', true: colors.primary + '80' }}
                thumbColor={stillAbroad ? colors.primary : '#bbb'}
                ios_backgroundColor="#e0e0e0"
              />
            </View>

            {!stillAbroad && (
              <>
                <Text style={styles.fieldLabel}>Return Date</Text>
                <TextInput
                  style={styles.dateInput}
                  value={retInput}
                  onChangeText={(t) => setRetInput(autoFmtDate(t))}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#ccc"
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Destination Country (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g. Mexico, Brazil, Philippines"
              placeholderTextColor="#ccc"
              autoCapitalize="words"
              returnKeyType="done"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowLog(false); resetLogForm(); }} activeOpacity={0.7}>
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: colors.primary }]} onPress={handleLogTrip} activeOpacity={0.85} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Save Trip</Text>}
              </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>
              Stored securely. Verify your status with an immigration attorney before applying for citizenship.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Edit Setup Modal ── */}
      <Modal visible={showEditSetup} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <DragHandle />
            <Text style={styles.modalTitle}>Update Green Card Info</Text>

            <Text style={styles.fieldLabel}>Green Card Approval Date</Text>
            <TextInput
              style={styles.dateInput}
              value={gcDateInput}
              onChangeText={(t) => setGcDateInput(autoFmtDate(t))}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#ccc"
              keyboardType="number-pad"
              maxLength={10}
            />

            <Text style={styles.fieldLabel}>Path to Citizenship</Text>
            <View style={styles.pathRow}>
              {[{ years: 5, sub: 'Most green cards' }, { years: 3, sub: 'Married to US citizen' }].map(({ years, sub }) => (
                <TouchableOpacity key={years} style={[styles.pathBtn, gcYears === years && styles.pathBtnActive]} onPress={() => setGcYears(years)} activeOpacity={0.85}>
                  <Text style={[styles.pathBtnTxt, gcYears === years && styles.pathBtnTxtActive]}>{years}-Year</Text>
                  <Text style={[styles.pathBtnSub, gcYears === years && { color: 'rgba(255,255,255,0.8)' }]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditSetup(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: colors.primary }]} onPress={handleSaveSetup} activeOpacity={0.85} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
