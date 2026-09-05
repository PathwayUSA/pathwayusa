import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../lib/supabase';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import PaywallPrompt from '../components/PaywallPrompt';
import StatusBadge from '../components/StatusBadge';
import {
  scheduleDocumentExpiryNotifications,
  cancelDocumentExpiryNotifications,
} from '../lib/notifications';

const DOC_TYPES = [
  { key: 'green_card',   label: 'Green Card',    icon: 'card-outline' },
  { key: 'passport',     label: 'Passport',       icon: 'book-outline' },
  { key: 'ead',          label: 'EAD',            icon: 'briefcase-outline' },
  { key: 'visa',         label: 'Visa',           icon: 'airplane-outline' },
  { key: 'i94',          label: 'I-94',           icon: 'document-text-outline' },
  { key: 'medical_exam', label: 'Medical Exam',   icon: 'medkit-outline' },
  { key: 'other',        label: 'Other',          icon: 'folder-outline' },
];

function docTypeInfo(key) {
  return DOC_TYPES.find((t) => t.key === key) ?? DOC_TYPES[DOC_TYPES.length - 1];
}

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
  if (days > 180) return '#27AE60';
  if (days > 60) return '#E67E22';
  return '#E74C3C';
}

function urgencyTone(days) {
  if (days > 180) return 'success';
  if (days > 60) return 'warning';
  return 'danger';
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background ?? '#F5F7F5' },
    content:   { padding: 16, paddingBottom: 48 },

    emptyBox:   { alignItems: 'center', paddingVertical: 56 },
    emptyIcon:  { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: TYPOGRAPHY.subheadingSize, fontWeight: TYPOGRAPHY.subheadingWeight, lineHeight: TYPOGRAPHY.subheadingLineHeight, color: colors.text ?? '#1A1A2E', marginBottom: 6 },
    emptySub:   { fontSize: 14, color: '#7F8C8D', textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },

    card: {
      backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
      ...SHADOWS.small, borderLeftWidth: 4, flexDirection: 'row', gap: 12,
    },
    cardIcon:    { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    cardBody:    { flex: 1 },
    cardType:    { fontSize: 11, fontWeight: '700', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    cardTitle:   { fontSize: 16, fontWeight: '700', color: colors.text ?? '#1A1A2E', marginBottom: 3 },
    cardDate:    { fontSize: 13, color: '#7F8C8D', marginBottom: 6 },
    cardNotes:   { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 6 },
    deleteBtn:   { padding: 4, alignSelf: 'flex-start' },

    addBtn: {
      backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14, marginBottom: 20,
    },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
    sheetTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, lineHeight: TYPOGRAPHY.headingLineHeight, color: '#1A1A2E', marginBottom: 20 },
    label:      { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
    input: {
      backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 16,
      paddingVertical: 13, fontSize: 15, color: '#333', marginBottom: 16,
    },
    typeChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary },
    typeChipActive: { backgroundColor: colors.primary },
    typeChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    typeChipTextActive: { color: '#fff' },

    sheetBtns:      { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn:      { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#f0f0f0' },
    cancelBtnText:  { fontWeight: '700', color: '#666' },
    saveBtn:        { flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.primary },
    saveBtnText:    { fontWeight: '800', color: '#fff' },
  });
}

export default function DocumentExpiryScreen() {
  const { colors }  = useTheme();
  const { user }    = useAuth();
  const { isPro }   = useSubscription();
  const insets      = useSafeAreaInsets();
  const styles      = useMemo(() => makeStyles(colors), [colors]);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState(DOC_TYPES[0].key);
  const [dateStr, setDateStr] = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);

  const loadRecords = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('document_expiry')
      .select('*')
      .eq('user_id', user.id)
      .order('expiry_date', { ascending: true });
    setRecords(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const openModal = () => {
    setDocName('');
    setDocType(DOC_TYPES[0].key);
    setDateStr('');
    setNotes('');
    setModalVisible(true);
  };

  const saveRecord = async () => {
    const trimName = docName.trim();
    if (!trimName) return Alert.alert('Missing name', 'Please enter a document name.');
    const parsed = new Date(dateStr.trim() + 'T12:00:00');
    if (isNaN(parsed.getTime())) return Alert.alert('Invalid date', 'Use the format YYYY-MM-DD (e.g. 2027-06-30).');
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('document_expiry')
      .insert({
        user_id: user.id,
        doc_name: trimName,
        doc_type: docType,
        expiry_date: parsed.toISOString().split('T')[0],
        notes: notes.trim() || null,
      })
      .select()
      .single();
    if (error) { Alert.alert('Error', error.message); setSaving(false); return; }
    if (data) await scheduleDocumentExpiryNotifications(data);
    setRecords((prev) =>
      [...prev, data].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    );
    setSaving(false);
    setModalVisible(false);
  };

  const deleteRecord = (rec) => {
    Alert.alert('Delete Record', `Remove "${rec.doc_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await cancelDocumentExpiryNotifications(rec.id);
          await supabase.from('document_expiry').delete().eq('id', rec.id);
          setRecords((prev) => prev.filter((r) => r.id !== rec.id));
        },
      },
    ]);
  };

  if (!isPro) {
    return <PaywallPrompt featureName="Document Expiry Tracker" />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.addBtn} onPress={openModal} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Track a Document</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🗂️</Text>
            <Text style={styles.emptyTitle}>No Documents Tracked</Text>
            <Text style={styles.emptySub}>
              Add your green card, passport, EAD, or visa expiry dates. We'll remind you 90, 30, and 7 days before each one.
            </Text>
          </View>
        ) : (
          records.map((rec) => {
            const days = daysUntil(rec.expiry_date);
            const uc   = urgencyColor(days);
            const info = docTypeInfo(rec.doc_type);
            return (
              <View key={rec.id} style={[styles.card, { borderLeftColor: uc }]}>
                <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight ?? colors.primary + '20' }]}>
                  <Ionicons name={info.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardType}>{info.label}</Text>
                  <Text style={styles.cardTitle}>{rec.doc_name}</Text>
                  <Text style={styles.cardDate}>Expires {formatDate(rec.expiry_date)}</Text>
                  <StatusBadge
                    tone={urgencyTone(days)}
                    label={days < 0 ? 'Expired' : days === 0 ? 'Expires today!' : `In ${days} days`}
                  />
                  {rec.notes ? <Text style={styles.cardNotes}>{rec.notes}</Text> : null}
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteRecord(rec)}>
                  <Ionicons name="trash-outline" size={18} color="#BDC3C7" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.sheetTitle}>Track a Document</Text>

            <Text style={styles.label}>Document type</Text>
            <View style={styles.typeChips}>
              {DOC_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, docType === t.key && styles.typeChipActive]}
                  onPress={() => setDocType(t.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.icon} size={14} color={docType === t.key ? '#fff' : colors.primary} />
                  <Text style={[styles.typeChipText, docType === t.key && styles.typeChipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>What is this document?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., My Green Card, Spouse's Passport"
              placeholderTextColor="#BDC3C7"
              value={docName}
              onChangeText={setDocName}
              maxLength={80}
              autoFocus
            />

            <Text style={styles.label}>Expiry date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2027-06-30"
              placeholderTextColor="#BDC3C7"
              value={dateStr}
              onChangeText={setDateStr}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Renew via Form I-765"
              placeholderTextColor="#BDC3C7"
              value={notes}
              onChangeText={setNotes}
              maxLength={140}
            />

            <Text style={{ fontSize: 12, color: '#BDC3C7', marginTop: -10, marginBottom: 16 }}>
              You'll get reminders 90, 30, and 7 days before this date.
            </Text>

            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveRecord} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save & Remind Me</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
