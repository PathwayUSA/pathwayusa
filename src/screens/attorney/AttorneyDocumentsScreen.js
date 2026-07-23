import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAttorney } from '../../context/AttorneyContext';
import { supabase } from '../../lib/supabase';
import { getStepTitle } from '../../lib/immigrationSteps';
import { SHADOWS } from '../../theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relDate(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'client', label: 'By Client' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    safe:       { flex: 1, backgroundColor: colors.primary },
    container:  { flex: 1, backgroundColor: colors.background },
    header:     { backgroundColor: colors.primary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTxt:  { fontSize: 20, fontWeight: '900', color: '#fff', flex: 1 },
    headerSub:  { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

    sortBar:    { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    sortChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1.5, borderColor: '#e0e0e0' },
    sortChipA:  { backgroundColor: colors.primary, borderColor: colors.primary },
    sortTxt:    { fontSize: 13, fontWeight: '600', color: '#888' },
    sortTxtA:   { color: '#fff' },

    list:       { padding: 16, gap: 10 },

    card:       { backgroundColor: '#fff', borderRadius: 16, padding: 14, ...SHADOWS.small },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    docIcon:    { width: 40, height: 40, borderRadius: 10, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    cardInfo:   { flex: 1 },
    docName:    { fontSize: 14, fontWeight: '700', color: '#1a1a2e', lineHeight: 19 },
    clientRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    clientName: { fontSize: 13, color: '#555', fontWeight: '600' },
    dotSep:     { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ccc' },
    stepLabel:  { fontSize: 12, color: '#888' },
    cardMeta:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dateTxt:    { fontSize: 12, color: '#aaa' },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusTxt:  { fontSize: 12, fontWeight: '700' },

    actionRow:  { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#e8f5e9', paddingVertical: 10, borderRadius: 10 },
    approveTxt: { fontSize: 13, fontWeight: '700', color: '#388e3c' },
    reviseBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff3e0', paddingVertical: 10, borderRadius: 10 },
    reviseTxt:  { fontSize: 13, fontWeight: '700', color: '#e65100' },

    emptyWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
    emptyTxt:   { fontSize: 15, color: '#aaa', textAlign: 'center', lineHeight: 22 },

    overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' },
    modalSub:   { fontSize: 13, color: '#888' },
    modalLabel: { fontSize: 13, fontWeight: '700', color: '#555' },
    modalInput: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 14, color: '#333', minHeight: 90, textAlignVertical: 'top' },
    modalBtns:  { flexDirection: 'row', gap: 10 },
    cancelBtn:  { flex: 1, borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    cancelTxt:  { fontSize: 14, fontWeight: '700', color: '#888' },
    submitBtn:  { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    submitTxt:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttorneyDocumentsScreen() {
  const { user }   = useAuth();
  const { colors } = useTheme();
  const { refreshCounts } = useAttorney();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort]         = useState('newest');
  const [modal, setModal]       = useState(null);  // { doc, action }
  const [comment, setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: links } = await supabase
      .from('attorney_clients')
      .select('client_id, profiles!attorney_clients_client_id_fkey(full_name)')
      .eq('attorney_id', user.id);

    if (!links?.length) { setDocs([]); setLoading(false); setRefreshing(false); return; }

    const ids       = links.map((l) => l.client_id);
    const nameMap   = Object.fromEntries(links.map((l) => [l.client_id, l.profiles?.full_name ?? 'Client']));

    const { data: rdocs } = await supabase
      .from('roadmap_documents')
      .select('*, document_reviews(status, comment)')
      .in('user_id', ids)
      .order('uploaded_at', { ascending: false });

    setDocs((rdocs ?? []).map((d) => ({ ...d, clientName: nameMap[d.user_id] ?? 'Client' })));
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const sorted = useMemo(() => {
    const list = [...docs];
    if (sort === 'newest') list.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    if (sort === 'oldest') list.sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
    if (sort === 'client') list.sort((a, b) => (a.clientName ?? '').localeCompare(b.clientName ?? ''));
    return list;
  }, [docs, sort]);

  const submitReview = async () => {
    if (!modal) return;
    if (modal.action === 'revise' && !comment.trim()) {
      Alert.alert('Comment required', 'Please explain what needs to be fixed.'); return;
    }
    setSubmitting(true);
    const status = modal.action === 'approve' ? 'approved' : 'needs_revision';
    await supabase.from('document_reviews').upsert({
      document_id: modal.doc.id,
      attorney_id: user.id,
      status,
      comment: comment.trim() || null,
      reviewed_at: new Date().toISOString(),
    }, { onConflict: 'document_id' });
    await supabase.from('roadmap_documents').update({ status }).eq('id', modal.doc.id);
    setDocs((prev) => prev.map((d) => d.id === modal.doc.id ? { ...d, status } : d));
    refreshCounts();
    setSubmitting(false);
    setModal(null);
    setComment('');
  };

  const statusTheme = (st) => {
    if (st === 'approved')       return { bg: '#e8f5e9', text: '#388e3c', label: 'Approved' };
    if (st === 'needs_revision') return { bg: '#fff3e0', text: '#e65100', label: 'Needs Revision' };
    return { bg: '#e3f2fd', text: '#1565c0', label: 'Pending Review' };
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTxt}>Document Review</Text>
            <Text style={styles.headerSub}>{docs.filter((d) => d.status === 'uploaded').length} pending review</Text>
          </View>
          <Ionicons name="folder-open" size={24} color="rgba(255,255,255,0.6)" />
        </View>

        <View style={styles.sortBar}>
          {SORTS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortChip, sort === s.key && styles.sortChipA]}
              onPress={() => setSort(s.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sortTxt, sort === s.key && styles.sortTxtA]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.emptyWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : sorted.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle-outline" size={56} color="#ddd" />
            <Text style={styles.emptyTxt}>All caught up!{'\n'}No documents to review right now.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
          >
            {sorted.map((doc) => {
              const theme = statusTheme(doc.status);
              return (
                <View key={doc.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.docIcon}>
                      <Ionicons name="document-text-outline" size={20} color="#1565c0" />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.docName} numberOfLines={2}>{doc.document_name}</Text>
                      <View style={styles.clientRow}>
                        <Text style={styles.clientName}>{doc.clientName}</Text>
                        <View style={styles.dotSep} />
                        <Text style={styles.stepLabel}>{getStepTitle(doc.step_id)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardMeta}>
                    <Text style={styles.dateTxt}>Uploaded {relDate(doc.uploaded_at)}</Text>
                    <View style={[styles.statusPill, { backgroundColor: theme.bg }]}>
                      <Text style={[styles.statusTxt, { color: theme.text }]}>{theme.label}</Text>
                    </View>
                  </View>

                  {doc.status === 'uploaded' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => { setModal({ doc, action: 'approve' }); setComment(''); }} activeOpacity={0.8}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#388e3c" />
                        <Text style={styles.approveTxt}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.reviseBtn} onPress={() => { setModal({ doc, action: 'revise' }); setComment(''); }} activeOpacity={0.8}>
                        <Ionicons name="warning-outline" size={18} color="#e65100" />
                        <Text style={styles.reviseTxt}>Request Revision</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {doc.status !== 'uploaded' && (
                    <TouchableOpacity
                      style={[styles.actionRow, { paddingTop: 8, marginTop: 8 }]}
                      onPress={() => {
                        const nextAction = doc.status === 'approved' ? 'revise' : 'approve';
                        setModal({ doc, action: nextAction });
                        setComment(doc.document_reviews?.[0]?.comment ?? '');
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={15} color="#aaa" />
                      <Text style={{ fontSize: 12, color: '#aaa', marginLeft: 4 }}>Change decision</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>

      {/* Review modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {modal?.action === 'approve' ? 'Approve Document' : 'Request Revision'}
            </Text>
            <Text style={styles.modalSub} numberOfLines={2}>{modal?.doc?.document_name}</Text>
            <Text style={styles.modalLabel}>
              {modal?.action === 'approve' ? 'Comment (optional)' : 'What needs to be fixed? (required)'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={
                modal?.action === 'approve'
                  ? 'e.g., Document looks complete and verified.'
                  : 'e.g., Page 2 of the tax return is missing. Please resubmit.'
              }
              placeholderTextColor="#bbb"
              value={comment}
              onChangeText={setComment}
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)} activeOpacity={0.8}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: modal?.action === 'approve' ? '#388e3c' : '#e65100' }]}
                onPress={submitReview}
                disabled={submitting || (modal?.action === 'revise' && !comment.trim())}
                activeOpacity={0.85}
              >
                <Text style={styles.submitTxt}>
                  {submitting ? 'Saving…' : modal?.action === 'approve' ? 'Approve' : 'Request Revision'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
