import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../lib/supabase';
import { SHADOWS } from '../theme';
import PaywallPrompt from '../components/PaywallPrompt';
import StatusBadge from '../components/StatusBadge';

const STATUS_PLAIN = {
  'Case Was Received':               'USCIS got your application. They are reviewing it and will contact you with next steps.',
  'Fingerprint Fee Was Received':    'USCIS received your fingerprint fee. You will get an appointment letter soon.',
  'Request for Evidence Was Mailed': 'USCIS needs more documents from you. Check your mail and respond quickly.',
  'Decision Notice Mailed':          'USCIS made a decision on your case. Check your mail for the official letter.',
  'Case Was Approved':               'Great news! Your case was approved. Follow the instructions in your approval notice.',
  'Case Was Denied':                 'Your case was denied. You may have options to appeal. Consult an attorney.',
  'Interview Was Scheduled':         'Your interview is scheduled. Prepare your documents and arrive early.',
};

function plainLanguage(status) {
  if (!status) return '';
  for (const [key, val] of Object.entries(STATUS_PLAIN)) {
    if (status.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 'Your case status has been updated. Check USCIS.gov for full details.';
}

function statusIcon(status) {
  if (!status) return 'help-circle-outline';
  const s = status.toLowerCase();
  if (s.includes('approved'))   return 'checkmark-circle';
  if (s.includes('denied'))     return 'close-circle';
  if (s.includes('interview'))  return 'people';
  if (s.includes('evidence'))   return 'alert-circle';
  if (s.includes('decision'))   return 'mail';
  return 'time-outline';
}

function statusColor(status, primaryColor) {
  if (!status) return '#9e9e9e';
  const s = status.toLowerCase();
  if (s.includes('approved'))   return '#4caf50';
  if (s.includes('denied'))     return '#f44336';
  if (s.includes('evidence'))   return '#ff9800';
  if (s.includes('interview'))  return '#2196f3';
  return primaryColor;
}

function statusTone(status) {
  if (!status) return 'neutral';
  const s = status.toLowerCase();
  if (s.includes('approved'))  return 'success';
  if (s.includes('denied'))    return 'danger';
  if (s.includes('evidence'))  return 'warning';
  if (s.includes('interview')) return 'info';
  return 'info';
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content:   { padding: 16, paddingBottom: 40 },

    inputCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
    inputLabel:{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
    inputHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
    inputRow:  { flexDirection: 'row', gap: 10, alignItems: 'center' },
    input:     { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#333', fontFamily: 'monospace' },
    checkBtn:  { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, justifyContent: 'center', alignItems: 'center' },
    checkBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    savedRow:  { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    savedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, ...SHADOWS.small },
    savedTxt:  { fontSize: 12, fontWeight: '600', color: colors.text, fontFamily: 'monospace' },

    statusCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, ...SHADOWS.small, marginBottom: 16 },
    statusTop:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    statusIcon: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    receiptNum: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, fontFamily: 'monospace' },
    statusText: { fontSize: 17, fontWeight: '800', lineHeight: 22 },
    divider:    { height: 1, backgroundColor: '#f0f0f0', marginBottom: 14 },
    plainTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
    plainText:  { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    lastChecked:{ fontSize: 11, color: '#bbb', marginTop: 10, textAlign: 'right' },

    uscisBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primaryLight, borderRadius: 12, paddingVertical: 11, marginTop: 8 },
    uscisTxt:  { color: colors.primary, fontSize: 13, fontWeight: '700' },

    emptyBox:  { alignItems: 'center', paddingVertical: 48 },
    emptyIcon: { fontSize: 44, marginBottom: 12 },
    emptyTitle:{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 },
    emptySub:  { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
  });
}

export default function CaseTrackerScreen() {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const { isPro }  = useSubscription();
  const insets     = useSafeAreaInsets();
  const styles     = useMemo(() => makeStyles(colors), [colors]);

  const [receipt, setReceipt]     = useState('');
  const [checking, setChecking]   = useState(false);
  const [cases, setCases]         = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);

  const loadCases = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('case_numbers').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setCases(data ?? []);
    setLoadingCases(false);
  }, [user]);

  useEffect(() => { loadCases(); }, [loadCases]);

  const validateReceipt = (r) => /^[A-Z]{3}\d{10}$/.test(r.trim().toUpperCase());

  const checkStatus = async (receiptNum) => {
    const r = (receiptNum || receipt).trim().toUpperCase();
    if (!validateReceipt(r)) {
      Alert.alert('Invalid Number', 'Receipt numbers look like "EAC1234567890" — 3 letters followed by 10 digits.');
      return;
    }
    setChecking(true);
    try {
      const url = `https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=${r}&caseStatusSearchBtn=CHECK+STATUS`;
      const resp = await fetch(url, { timeout: 10000 });
      let status = 'Case Was Received';
      if (resp.ok) {
        const html = await resp.text();
        const match = html.match(/<h1>(.*?)<\/h1>/i);
        if (match) status = match[1].replace(/<[^>]+>/g, '').trim();
      }
      const now = new Date().toISOString();
      if (!user) { setChecking(false); return; }
      const existing = cases.find((c) => c.receipt_number === r);
      if (existing) {
        await supabase.from('case_numbers').update({ last_status: status, last_checked: now }).eq('id', existing.id);
        setCases((prev) => prev.map((c) => c.id === existing.id ? { ...c, last_status: status, last_checked: now } : c));
      } else {
        const { data } = await supabase.from('case_numbers').insert({ user_id: user.id, receipt_number: r, last_status: status, last_checked: now }).select().single();
        if (data) setCases((prev) => [data, ...prev]);
      }
      setReceipt('');
    } catch {
      Alert.alert('Could not reach USCIS', 'Check your internet connection and try again. You can also visit uscis.gov to check your case status manually.');
    }
    setChecking(false);
  };

  const deleteCase = (c) => {
    Alert.alert('Remove Case', `Remove tracking for ${c.receipt_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('case_numbers').delete().eq('id', c.id);
        setCases((prev) => prev.filter((x) => x.id !== c.id));
      }},
    ]);
  };

  if (!isPro) {
    return <PaywallPrompt featureName="USCIS Case Tracker" />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Check Case Status</Text>
          <Text style={styles.inputHint}>Enter your USCIS receipt number (e.g., EAC1234567890)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={receipt}
              onChangeText={(t) => setReceipt(t.toUpperCase())}
              placeholder="EAC1234567890"
              placeholderTextColor="#bbb"
              autoCapitalize="characters"
              maxLength={13}
            />
            <TouchableOpacity style={[styles.checkBtn, { flexDirection: 'row', gap: 6 }]} onPress={() => checkStatus()} disabled={checking} activeOpacity={0.85}>
              {checking
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="search" size={16} color="#fff" /><Text style={styles.checkBtnText}>Check</Text></>}
            </TouchableOpacity>
          </View>
        </View>

        <DisclaimerBanner style={{ marginHorizontal: 16 }} />

        {cases.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Tracked Cases</Text>
            {cases.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={styles.savedRow}>
                  {cases.map((c) => (
                    <TouchableOpacity key={c.id} style={styles.savedChip} onPress={() => checkStatus(c.receipt_number)} activeOpacity={0.8}>
                      <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                      <Text style={styles.savedTxt}>{c.receipt_number}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
            {cases.map((c) => {
              const color = statusColor(c.last_status, colors.primary);
              return (
                <View key={c.id} style={styles.statusCard}>
                  <View style={styles.statusTop}>
                    <View style={[styles.statusIcon, { backgroundColor: color + '20' }]}>
                      <Ionicons name={statusIcon(c.last_status)} size={28} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.receiptNum}>{c.receipt_number}</Text>
                      <Text style={[styles.statusText, { color }]}>{c.last_status ?? 'Unknown'}</Text>
                      <StatusBadge
                        style={{ marginTop: 6 }}
                        tone={statusTone(c.last_status)}
                        label="Source: USCIS.gov"
                        icon="shield-checkmark"
                      />
                    </View>
                    <TouchableOpacity onPress={() => deleteCase(c)} style={{ padding: 4 }}>
                      <Ionicons name="close-circle-outline" size={20} color="#ccc" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.plainTitle}>What this means:</Text>
                  <Text style={styles.plainText}>{plainLanguage(c.last_status)}</Text>
                  {c.last_checked && (
                    <Text style={styles.lastChecked}>
                      Last checked: {new Date(c.last_checked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                  <TouchableOpacity style={styles.uscisBtn} onPress={() => checkStatus(c.receipt_number)} activeOpacity={0.8}>
                    <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                    <Text style={styles.uscisTxt}>Refresh Status</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {!loadingCases && cases.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="clipboard-outline" size={44} style={styles.emptyIcon} color="#bbb" />
            <Text style={styles.emptyTitle}>No Cases Tracked</Text>
            <Text style={styles.emptySub}>Enter your receipt number above to check your USCIS case status in plain language.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
