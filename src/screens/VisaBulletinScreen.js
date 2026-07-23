import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';

const VB_KEY = '@pathwayusa/visa_bulletin_prefs';

// November 2025 Visa Bulletin cut-off dates (illustrative — users should check uscis.gov monthly)
const CUTOFF_DATES = {
  F1:  { worldwide: '2017-10-22', china: '2013-01-01', india: '2013-01-01', mexico: '2003-10-22', philippines: '2012-08-15' },
  F2A: { worldwide: 'C',          china: 'C',           india: 'C',           mexico: '2022-12-01', philippines: 'C'          },
  F2B: { worldwide: '2018-05-01', china: '2018-05-01', india: '2018-05-01', mexico: '2005-11-22', philippines: '2012-06-01' },
  F3:  { worldwide: '2010-08-01', china: '2010-08-01', india: '2010-08-01', mexico: '1998-05-01', philippines: '2001-11-15' },
  F4:  { worldwide: '2007-01-22', china: '2007-01-22', india: '2005-03-22', mexico: '1998-08-01', philippines: '1997-03-01' },
  EB1: { worldwide: 'C',          china: '2022-09-08', india: '2022-09-08', mexico: 'C',          philippines: 'C'          },
  EB2: { worldwide: 'C',          china: '2019-08-01', india: '2012-09-01', mexico: 'C',          philippines: 'C'          },
  EB3: { worldwide: 'C',          china: '2019-06-08', india: '2012-05-01', mexico: '2022-01-01', philippines: '2021-11-01' },
  EB4: { worldwide: 'C',          china: 'C',           india: 'C',           mexico: '2022-02-22', philippines: '2019-09-22' },
  EB5: { worldwide: 'C',          china: '2015-09-22', india: '2019-12-08', mexico: 'C',          philippines: 'C'          },
};

const CATEGORIES = [
  { key: 'F1',  label: 'F1 — Unmarried Sons/Daughters of US Citizens' },
  { key: 'F2A', label: 'F2A — Spouses/Children of Permanent Residents' },
  { key: 'F2B', label: 'F2B — Unmarried Sons/Daughters of PRs (21+)' },
  { key: 'F3',  label: 'F3 — Married Sons/Daughters of US Citizens' },
  { key: 'F4',  label: 'F4 — Brothers/Sisters of US Citizens' },
  { key: 'EB1', label: 'EB-1 — Priority Workers' },
  { key: 'EB2', label: 'EB-2 — Advanced Degree/Exceptional Ability' },
  { key: 'EB3', label: 'EB-3 — Skilled Workers/Professionals' },
  { key: 'EB4', label: 'EB-4 — Special Immigrants' },
  { key: 'EB5', label: 'EB-5 — Investor' },
];

const COUNTRIES = [
  { key: 'worldwide',   label: 'All Other Countries' },
  { key: 'china',       label: 'China (Mainland)' },
  { key: 'india',       label: 'India' },
  { key: 'mexico',      label: 'Mexico' },
  { key: 'philippines', label: 'Philippines' },
];

function isCurrent(cutoff) {
  if (!cutoff || cutoff === 'C') return true;
  if (cutoff === 'U') return false;
  return new Date(cutoff) <= new Date();
}

function monthsDiff(dateStr) {
  if (!dateStr || dateStr === 'C') return 0;
  const cutoff = new Date(dateStr);
  const now    = new Date();
  return Math.max(0, Math.round((now - cutoff) / (1000 * 60 * 60 * 24 * 30.44)));
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'C') return 'Current';
  if (dateStr === 'U') return 'Unavailable';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function VisaBulletinScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [category, setCategory]     = useState('');
  const [country, setCountry]       = useState('worldwide');
  const [priorityDate, setPriority] = useState('');
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(VB_KEY).then((v) => {
      if (v) {
        const p = JSON.parse(v);
        setCategory(p.category || '');
        setCountry(p.country || 'worldwide');
        setPriority(p.priorityDate || '');
        setSaved(true);
      }
    });
  }, []);

  const handleSave = async () => {
    await AsyncStorage.setItem(VB_KEY, JSON.stringify({ category, country, priorityDate }));
    setSaved(true);
  };

  const cutoff  = category && country ? CUTOFF_DATES[category]?.[country] : null;
  const current = cutoff ? isCurrent(cutoff) : null;
  const behindMonths = cutoff && !isCurrent(cutoff) ? monthsDiff(cutoff) : 0;

  const priorCurrent = priorityDate && cutoff
    ? (cutoff === 'C' || (cutoff !== 'U' && new Date(priorityDate) <= new Date(cutoff)))
    : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={['#1565c0', '#1976d2']} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroTitle}>Visa Bulletin Tracker</Text>
        <Text style={styles.heroSub}>Track your priority date against monthly cut-offs</Text>
      </LinearGradient>

      {/* Explainer */}
      <View style={[styles.infoCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.text }]}>
          The Visa Bulletin shows the earliest priority date for which immigrant visas are currently available. If your priority date is earlier than the cut-off date for your category and country, your date is "current" and you may be able to file.
        </Text>
      </View>

      {/* Setup */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>YOUR INFORMATION</Text>

      <View style={[styles.card, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PREFERENCE CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.catChip, category === c.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.catChipText, category === c.key && { color: '#fff' }]}>{c.key}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {category && <Text style={[styles.catFullLabel, { color: colors.textSecondary }]}>{CATEGORIES.find((c) => c.key === category)?.label}</Text>}

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>COUNTRY OF CHARGEABILITY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {COUNTRIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.catChip, country === c.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setCountry(c.key)}
            >
              <Text style={[styles.catChipText, country === c.key && { color: '#fff' }]}>{c.label.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>YOUR PRIORITY DATE (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.dateInput, { color: colors.text, borderColor: colors.primary + '40' }]}
          placeholder="e.g. 2019-03-15"
          placeholderTextColor={colors.textSecondary}
          value={priorityDate}
          onChangeText={setPriority}
          keyboardType="numbers-and-punctuation"
        />

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <Ionicons name="bookmark-outline" size={16} color="#fff" />
          <Text style={styles.saveBtnText}>Save My Dates</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {category && country && cutoff !== null && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CURRENT STATUS</Text>

          <View style={[
            styles.statusCard,
            { backgroundColor: current ? '#e8f5e9' : '#fff3e0' },
            SHADOWS.small,
          ]}>
            <Ionicons
              name={current ? 'checkmark-circle' : 'time-outline'}
              size={32}
              color={current ? '#2e7d32' : '#e65100'}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: current ? '#2e7d32' : '#e65100' }]}>
                {current ? 'CURRENT ✓' : 'NOT YET CURRENT'}
              </Text>
              <Text style={[styles.statusSub, { color: current ? '#388e3c' : '#bf360c' }]}>
                {current
                  ? 'Visas are currently available for your category and country.'
                  : `Your category is approximately ${behindMonths} months behind the current cut-off.`}
              </Text>
              <Text style={[styles.cutoffDate, { color: '#555' }]}>
                Current cut-off: <Text style={{ fontWeight: '800' }}>{formatDate(cutoff)}</Text>
              </Text>
            </View>
          </View>

          {priorityDate && priorCurrent !== null && (
            <View style={[
              styles.statusCard,
              { backgroundColor: priorCurrent ? '#e8f5e9' : '#fce4ec' },
              SHADOWS.small,
            ]}>
              <Ionicons
                name={priorCurrent ? 'checkmark-circle' : 'hourglass-outline'}
                size={32}
                color={priorCurrent ? '#2e7d32' : '#c62828'}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusTitle, { color: priorCurrent ? '#2e7d32' : '#c62828' }]}>
                  {priorCurrent ? 'YOUR DATE IS CURRENT' : 'YOUR DATE IS NOT YET CURRENT'}
                </Text>
                <Text style={[styles.statusSub, { color: priorCurrent ? '#388e3c' : '#b71c1c' }]}>
                  {priorCurrent
                    ? 'Your priority date has been reached! Contact your attorney immediately to discuss filing.'
                    : `Your priority date (${formatDate(priorityDate)}) has not yet been reached by the cut-off date.`}
                </Text>
              </View>
            </View>
          )}

          {priorCurrent && (
            <View style={[styles.urgentBox, { backgroundColor: '#b71c1c' }]}>
              <Ionicons name="alert" size={20} color="#fff" />
              <Text style={styles.urgentText}>
                URGENT: Your priority date is current! Contact your immigration attorney immediately. Do not delay filing.
              </Text>
            </View>
          )}
        </>
      )}

      {/* All categories table */}
      {country && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ALL CUT-OFF DATES FOR {COUNTRIES.find(c => c.key === country)?.label.toUpperCase()}</Text>
          <View style={[styles.tableCard, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
            {CATEGORIES.map((cat, i) => {
              const co = CUTOFF_DATES[cat.key]?.[country];
              const curr = isCurrent(co);
              return (
                <View key={cat.key} style={[styles.tableRow, i < CATEGORIES.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }]}>
                  <Text style={[styles.tableKey, { color: colors.primary }]}>{cat.key}</Text>
                  <Text style={[styles.tableDate, { color: colors.text }]}>{formatDate(co)}</Text>
                  <View style={[styles.tablePill, { backgroundColor: curr ? '#e8f5e9' : '#fff3e0' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: curr ? '#2e7d32' : '#e65100' }}>{curr ? 'Current' : 'Waiting'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.vbBtn} onPress={() => Linking.openURL('https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html')}>
        <Ionicons name="open-outline" size={16} color="#fff" />
        <Text style={styles.vbBtnText}>View Official Visa Bulletin</Text>
      </TouchableOpacity>

      <View style={[styles.disclaimer, { backgroundColor: '#fff8e1' }]}>
        <Ionicons name="warning-outline" size={14} color="#f9a825" />
        <Text style={[styles.disclaimerText, { color: '#7c6c0e' }]}>
          Cut-off dates shown are for illustration. Always verify current dates at travel.state.gov. Consult an immigration attorney before filing.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 16, gap: 12 },

  hero:     { borderRadius: 20, padding: 20, gap: 6, marginBottom: 4 },
  heroTitle:{ fontSize: 20, fontWeight: '900', color: '#fff' },
  heroSub:  { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, padding: 14 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 4, marginTop: 4 },

  card:       { borderRadius: 18, padding: 16, gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },

  catRow:       { gap: 8, paddingVertical: 4 },
  catChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd' },
  catChipText:  { fontSize: 12, fontWeight: '700', color: '#666' },
  catFullLabel: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },

  dateInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginTop: 4 },
  saveBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 12, marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  statusCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, padding: 16 },
  statusTitle: { fontSize: 15, fontWeight: '900', marginBottom: 4 },
  statusSub:   { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  cutoffDate:  { fontSize: 12 },

  urgentBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 14 },
  urgentText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 19 },

  tableCard: { borderRadius: 16, overflow: 'hidden' },
  tableRow:  { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  tableKey:  { width: 40, fontSize: 13, fontWeight: '800' },
  tableDate: { flex: 1, fontSize: 13 },
  tablePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  vbBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1565c0', borderRadius: 16, paddingVertical: 14 },
  vbBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  disclaimer:     { borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
