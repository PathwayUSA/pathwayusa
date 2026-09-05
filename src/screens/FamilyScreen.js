import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = '@pathwayusa/family_members';

const RELATIONS = ['Spouse / Partner', 'Child', 'Parent', 'Sibling', 'Other'];
const PATHS = [
  { key: 'citizenship',  label: 'Citizenship',     icon: 'shield-checkmark-outline', color: '#1565c0' },
  { key: 'green_card',   label: 'Green Card',       icon: 'card-outline',             color: '#2e7d32' },
  { key: 'asylum',       label: 'Asylum',           icon: 'home-outline',             color: '#7b1fa2' },
  { key: 'work_visa',    label: 'Work Visa',        icon: 'briefcase-outline',        color: '#e65100' },
  { key: 'student_visa', label: 'Student Visa',     icon: 'school-outline',           color: '#0288d1' },
  { key: 'daca',         label: 'DACA / TPS',       icon: 'leaf-outline',             color: '#558b2f' },
  { key: 'other',        label: 'Other / Pending',  icon: 'help-circle-outline',      color: '#757575' },
];
const STATUS_LIST = [
  { key: 'not_started', label: 'Not Started', color: '#9e9e9e' },
  { key: 'gathering',   label: 'Gathering Docs', color: '#FF9800' },
  { key: 'filed',       label: 'Application Filed', color: '#1565c0' },
  { key: 'interview',   label: 'Interview Scheduled', color: '#7b1fa2' },
  { key: 'approved',    label: 'Approved', color: '#2e7d32' },
  { key: 'completed',   label: 'Completed', color: '#4caf50' },
];

function pathFor(key) { return PATHS.find((p) => p.key === key) ?? PATHS[PATHS.length - 1]; }
function statusFor(key) { return STATUS_LIST.find((s) => s.key === key) ?? STATUS_LIST[0]; }
function uid() { return Math.random().toString(36).slice(2, 10); }

function MemberCard({ member, colors, onEdit, onDelete }) {
  const path   = pathFor(member.path);
  const status = statusFor(member.status);
  const pct    = STATUS_LIST.findIndex((s) => s.key === member.status);
  const progress = Math.round(((pct < 0 ? 0 : pct) / (STATUS_LIST.length - 1)) * 100);

  return (
    <View style={[s.card, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
      <View style={s.cardHeader}>
        <View style={[s.avatar, { backgroundColor: path.color + '22' }]}>
          <Ionicons name={path.icon} size={22} color={path.color} />
        </View>
        <View style={s.cardInfo}>
          <Text style={[s.memberName, { color: colors.text }]}>{member.name}</Text>
          <Text style={[s.memberRelation, { color: colors.textSecondary }]}>
            {member.relation} · {path.label}
          </Text>
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity onPress={() => onEdit(member)} style={s.iconBtn}>
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(member.id)} style={s.iconBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.progressRow}>
        <View style={[s.statusPill, { backgroundColor: status.color + '22' }]}>
          <View style={[s.statusDot, { backgroundColor: status.color }]} />
          <Text style={[s.statusLabel, { color: status.color }]}>{status.label}</Text>
        </View>
        <Text style={[s.progressPct, { color: colors.textSecondary }]}>{progress}%</Text>
      </View>
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: status.color }]} />
      </View>

      {!!member.notes && (
        <Text style={[s.notes, { color: colors.textSecondary }]} numberOfLines={2}>{member.notes}</Text>
      )}
    </View>
  );
}

const BLANK = { name: '', relation: RELATIONS[0], path: 'green_card', status: 'not_started', notes: '' };

function MemberModal({ visible, initial, onSave, onClose, colors }) {
  const [form, setForm] = useState(BLANK);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setForm(initial ? { ...initial } : { ...BLANK });
  }, [initial, visible]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert('Name required', 'Please enter a name for this family member.'); return; }
    onSave({ ...form, name: form.name.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.modalContainer, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border || '#eee' }]}>
            <TouchableOpacity onPress={onClose}><Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text></TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>{initial?.id ? 'Edit Member' : 'Add Family Member'}</Text>
            <TouchableOpacity onPress={handleSave}><Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <View>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.card || '#fff', color: colors.text, borderColor: colors.border || '#eee' }]}
                placeholder="e.g. Maria García"
                placeholderTextColor={colors.textSecondary}
                value={form.name}
                onChangeText={(v) => set('name', v)}
              />
            </View>

            {/* Relation */}
            <View>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Relationship</Text>
              <View style={s.chipRow}>
                {RELATIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[s.chip, form.relation === r && { backgroundColor: colors.primary }]}
                    onPress={() => set('relation', r)}
                  >
                    <Text style={[s.chipTxt, form.relation === r && { color: '#fff' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Path */}
            <View>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Immigration Path</Text>
              {PATHS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[s.radioRow, { backgroundColor: colors.card || '#fff', borderColor: form.path === p.key ? p.color : (colors.border || '#eee') }]}
                  onPress={() => set('path', p.key)}
                >
                  <Ionicons name={p.icon} size={20} color={form.path === p.key ? p.color : colors.textSecondary} />
                  <Text style={[s.radioTxt, { color: form.path === p.key ? p.color : colors.text, fontWeight: form.path === p.key ? '700' : '400' }]}>{p.label}</Text>
                  {form.path === p.key && <Ionicons name="checkmark-circle" size={20} color={p.color} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Status */}
            <View>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Current Status</Text>
              {STATUS_LIST.map((st) => (
                <TouchableOpacity
                  key={st.key}
                  style={[s.radioRow, { backgroundColor: colors.card || '#fff', borderColor: form.status === st.key ? st.color : (colors.border || '#eee') }]}
                  onPress={() => set('status', st.key)}
                >
                  <View style={[s.statusDot, { backgroundColor: st.color }]} />
                  <Text style={[s.radioTxt, { color: form.status === st.key ? st.color : colors.text, fontWeight: form.status === st.key ? '700' : '400' }]}>{st.label}</Text>
                  {form.status === st.key && <Ionicons name="checkmark-circle" size={20} color={st.color} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <View>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Notes (optional)</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: colors.card || '#fff', color: colors.text, borderColor: colors.border || '#eee' }]}
                placeholder="Case number, next appointment, important dates…"
                placeholderTextColor={colors.textSecondary}
                value={form.notes}
                onChangeText={(v) => set('notes', v)}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FamilyScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);

  const storageKey = user ? `${STORAGE_KEY}/${user.id}` : STORAGE_KEY;

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      setMembers(raw ? JSON.parse(raw) : []);
    } catch { setMembers([]); } finally { setLoading(false); }
  }, [storageKey]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (list) => {
    setMembers(list);
    await AsyncStorage.setItem(storageKey, JSON.stringify(list));
  }, [storageKey]);

  const handleSave = useCallback((form) => {
    setMembers((prev) => {
      const updated = editing?.id
        ? prev.map((m) => (m.id === editing.id ? { ...form, id: m.id } : m))
        : [...prev, { ...form, id: uid(), created_at: new Date().toISOString() }];
      AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
    setModalVisible(false);
    setEditing(null);
  }, [editing, storageKey]);

  const handleDelete = useCallback((id) => {
    Alert.alert('Remove Member', 'Remove this family member from your tracker?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          setMembers((prev) => {
            const updated = prev.filter((m) => m.id !== id);
            AsyncStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
          });
        },
      },
    ]);
  }, [storageKey]);

  const openAdd  = () => { setEditing(null); setModalVisible(true); };
  const openEdit = (m) => { setEditing(m); setModalVisible(true); };

  const completed = members.filter((m) => m.status === 'completed' || m.status === 'approved').length;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primary + 'cc']}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={s.headerTitle}>Family Mode</Text>
          <Text style={s.headerSub}>Track your whole family's journey</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={s.addBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Summary bar */}
      {members.length > 0 && (
        <View style={[s.summaryBar, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: colors.primary }]}>{members.length}</Text>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Members</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: '#4caf50' }]}>{completed}</Text>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: '#FF9800' }]}>{members.length - completed}</Text>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : members.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="people-outline" size={72} color={colors.primary + '55'} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No family members yet</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>
            Add your spouse, children, or parents to track everyone's immigration journey in one place.
          </Text>
          <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.emptyBtnTxt}>Add Family Member</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}>
          {members.map((m) => (
            <MemberCard key={m.id} member={m} colors={colors} onEdit={openEdit} onDelete={handleDelete} />
          ))}
          <TouchableOpacity style={[s.addMoreBtn, { borderColor: colors.primary }]} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[s.addMoreTxt, { color: colors.primary }]}>Add Another Member</Text>
          </TouchableOpacity>
          <View style={s.tipCard}>
            <Ionicons name="information-circle-outline" size={18} color="#1565c0" />
            <Text style={s.tipTxt}>
              Family member data is stored on this device only. Encourage each family member to download PathwayUSA for their own personalized journey.
            </Text>
          </View>
        </ScrollView>
      )}

      <MemberModal
        visible={modalVisible}
        initial={editing}
        onSave={handleSave}
        onClose={() => { setModalVisible(false); setEditing(null); }}
        colors={colors}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  backBtn:       { padding: 4 },
  addBtn:        { padding: 4 },
  headerContent: { flex: 1 },
  headerTitle:   { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, lineHeight: TYPOGRAPHY.displayLineHeight, color: '#fff' },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  summaryBar:    { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, marginBottom: 4, borderRadius: 14, padding: 14 },
  summaryItem:   { flex: 1, alignItems: 'center' },
  summaryDivider:{ width: 1, backgroundColor: '#eee', marginVertical: 4 },
  summaryNum:    { fontSize: 24, fontWeight: '900' },
  summaryLabel:  { fontSize: 11, marginTop: 2 },

  card:          { borderRadius: 16, padding: 16 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar:        { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cardInfo:      { flex: 1 },
  memberName:    { fontSize: 16, fontWeight: '800' },
  memberRelation:{ fontSize: 13, marginTop: 2 },
  cardActions:   { flexDirection: 'row', gap: 8 },
  iconBtn:       { padding: 6 },

  progressRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statusPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot:     { width: 7, height: 7, borderRadius: 4 },
  statusLabel:   { fontSize: 12, fontWeight: '700' },
  progressPct:   { fontSize: 12, fontWeight: '600' },
  progressBar:   { height: 5, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: 5, borderRadius: 3 },
  notes:         { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },

  emptyWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle:    { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, lineHeight: TYPOGRAPHY.headingLineHeight, marginTop: 16, textAlign: 'center' },
  emptySub:      { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  emptyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnTxt:   { color: '#fff', fontSize: 16, fontWeight: '700' },

  addMoreBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderRadius: 14, paddingVertical: 14, borderStyle: 'dashed' },
  addMoreTxt:    { fontSize: 15, fontWeight: '700' },

  tipCard:       { flexDirection: 'row', gap: 10, backgroundColor: '#e3f2fd', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  tipTxt:        { flex: 1, fontSize: 12, color: '#1565c0', lineHeight: 17 },

  // Modal
  modalContainer:{ flex: 1 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle:    { fontSize: 17, fontWeight: '800' },
  fieldLabel:    { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input:         { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  textArea:      { minHeight: 80, textAlignVertical: 'top' },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  chipTxt:       { fontSize: 13, fontWeight: '600', color: '#555' },
  radioRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 6 },
  radioTxt:      { fontSize: 14 },
});
