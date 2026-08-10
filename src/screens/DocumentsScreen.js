import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../lib/supabase';
import { SHADOWS } from '../theme';
import PaywallPrompt from '../components/PaywallPrompt';
import StatusBadge from '../components/StatusBadge';
import GlossaryText from '../components/GlossaryText';

const PATHS = {
  'Citizenship (N-400)': [
    'Passport or travel document',
    'Green card (front and back)',
    'Marriage certificate (if applicable)',
    'Divorce decree (if applicable)',
    'Tax returns (last 5 years)',
    'Proof of continuous residence',
    'Proof of physical presence',
    'Photos (2 passport-style)',
  ],
  'Green Card': [
    'Valid passport',
    'Birth certificate',
    'Police clearance certificate',
    'Medical examination (Form I-693)',
    'Sponsor\'s financial support (I-864)',
    'Proof of relationship (if family-based)',
    'Employment records (if employment-based)',
    'Photos (2 passport-style)',
  ],
  'Asylum': [
    'Passport or travel document',
    'Evidence of persecution',
    'Country conditions reports',
    'Police reports or arrest records',
    'Witness letters',
    'Medical records (if relevant)',
    'Photos (2 passport-style)',
  ],
  'Family Petition': [
    'Petitioner\'s passport',
    'Petitioner\'s green card or citizenship proof',
    'Beneficiary\'s passport',
    'Birth certificate (showing relationship)',
    'Marriage certificate (if spouse)',
    'Divorce decrees (all prior marriages)',
    'Photos (2 passport-style)',
  ],
};

const PATH_KEYS = Object.keys(PATHS);

// Pre-storage-migration rows have a local device URI in photo_uri instead of a
// client-documents storage path — those files never existed server-side.
const isLocalUri = (uri) => typeof uri === 'string' && (uri.startsWith('file://') || uri.startsWith('blob:'));

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function makeStyles(colors) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: colors.background },
    content:     { padding: 16, paddingBottom: 40 },

    pathPicker:  { marginBottom: 20 },
    pathLabel:   { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
    pathChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#fff' },
    chipActive:  { backgroundColor: colors.primary },
    chipText:    { fontSize: 13, fontWeight: '600', color: colors.primary },
    chipTextAct: { color: '#fff' },

    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOWS.small },
    progressBar: { flex: 1, height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' },
    progressFill:{ height: 6, borderRadius: 3 },
    progressTxt: { fontSize: 13, fontWeight: '700', color: colors.text, flexShrink: 0 },

    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 16, ...SHADOWS.small },
    searchInput: { flex: 1, fontSize: 14, color: colors.text },

    expiryBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
      borderRadius: 14, padding: 14, marginBottom: 20, ...SHADOWS.small,
    },
    expiryIcon:  { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
    expiryTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    expirySub:   { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

    reuploadBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF8E1',
      borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#FFE0A3',
    },
    reuploadIcon:  { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FFECB3', justifyContent: 'center', alignItems: 'center' },
    reuploadTitle: { fontSize: 14, fontWeight: '700', color: '#7A5900' },
    reuploadSub:   { fontSize: 12, color: '#9A7300', marginTop: 2 },

    docRow: {
      backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
      flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOWS.small,
    },
    checkbox:    { width: 26, height: 26, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    docName:     { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },
    docNameDone: { textDecorationLine: 'line-through' },
    thumbnail:   { width: 40, height: 40, borderRadius: 8, flexShrink: 0, backgroundColor: '#eee' },
    cameraBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    reuploadBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFECB3', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  });
}

export default function DocumentsScreen({ navigation }) {
  const { colors }  = useTheme();
  const { user }    = useAuth();
  const { isPro }   = useSubscription();
  const insets      = useSafeAreaInsets();
  const styles      = useMemo(() => makeStyles(colors), [colors]);

  const [selectedPath, setSelectedPath] = useState(PATH_KEYS[0]);
  const [search, setSearch] = useState('');
  const [docs, setDocs]   = useState({});
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState({}); // storage path -> short-lived signed URL
  const [uploadingDoc, setUploadingDoc] = useState(null);

  const resolveSignedUrls = useCallback(async (rows) => {
    const paths = rows.map((d) => d.photo_uri).filter((p) => p && !isLocalUri(p));
    if (paths.length === 0) return;
    const { data, error } = await supabase.storage.from('client-documents').createSignedUrls(paths, 300);
    if (error || !data) return;
    setSignedUrls((prev) => {
      const next = { ...prev };
      data.forEach((s) => { if (s.signedUrl) next[s.path] = s.signedUrl; });
      return next;
    });
  }, []);

  const loadDocs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', user.id);
    const rows = data ?? [];
    const map = {};
    rows.forEach((d) => { map[d.document_name] = d; });
    setDocs(map);
    setLoading(false);
    resolveSignedUrls(rows);
  }, [user, resolveSignedUrls]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const toggleCheck = async (docName) => {
    if (!user) return;
    const existing = docs[docName];
    const newChecked = !(existing?.checked ?? false);
    if (existing) {
      await supabase.from('user_documents').update({ checked: newChecked }).eq('id', existing.id);
      setDocs((prev) => ({ ...prev, [docName]: { ...prev[docName], checked: newChecked } }));
    } else {
      const { data } = await supabase
        .from('user_documents')
        .insert({ user_id: user.id, document_name: docName, checked: newChecked })
        .select().single();
      if (data) setDocs((prev) => ({ ...prev, [docName]: data }));
    }
  };

  const pickPhoto = async (docName) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach document photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const existing = docs[docName];

    setUploadingDoc(docName);
    try {
      const rawExt = asset.uri.split('.').pop()?.split('?')[0]?.toLowerCase();
      const ext    = rawExt && rawExt.length <= 4 ? rawExt : 'jpg';
      const path   = `${user.id}/${slugify(docName)}-${Date.now()}.${ext}`;
      const blob   = await fetch(asset.uri).then((r) => r.blob());

      const { error: upErr } = await supabase.storage
        .from('client-documents')
        .upload(path, blob, { contentType: blob.type || `image/${ext}`, upsert: true });
      if (upErr) throw upErr;

      // Best-effort cleanup of the previous object so replacing a photo doesn't
      // leave an orphaned file behind. Nothing to delete for legacy local URIs.
      if (existing?.photo_uri && !isLocalUri(existing.photo_uri) && existing.photo_uri !== path) {
        supabase.storage.from('client-documents').remove([existing.photo_uri]).catch(() => {});
      }

      if (existing) {
        await supabase.from('user_documents').update({ photo_uri: path, checked: true }).eq('id', existing.id);
        setDocs((prev) => ({ ...prev, [docName]: { ...prev[docName], photo_uri: path, checked: true } }));
      } else {
        const { data } = await supabase
          .from('user_documents')
          .insert({ user_id: user.id, document_name: docName, checked: true, photo_uri: path })
          .select().single();
        if (data) setDocs((prev) => ({ ...prev, [docName]: data }));
      }
      await resolveSignedUrls([{ photo_uri: path }]);
    } catch {
      Alert.alert('Upload failed', 'Could not save that photo. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const allDocs     = PATHS[selectedPath] ?? [];
  const currentDocs = search.trim()
    ? allDocs.filter((d) => d.toLowerCase().includes(search.trim().toLowerCase()))
    : allDocs;
  const completed   = allDocs.filter((d) => docs[d]?.checked).length;
  const pct         = allDocs.length > 0 ? completed / allDocs.length : 0;
  const legacyCount = Object.values(docs).filter((d) => isLocalUri(d?.photo_uri)).length;

  if (!isPro) {
    return <PaywallPrompt featureName="Document Checklist" />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pathPicker}>
          <Text style={styles.pathLabel}>Immigration Path</Text>
          <View style={styles.pathChips}>
            {PATH_KEYS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, selectedPath === p && styles.chipActive]}
                onPress={() => setSelectedPath(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, selectedPath === p && styles.chipTextAct]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.progressRow}>
          <Ionicons name="documents-outline" size={22} color={colors.primary} />
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={styles.progressTxt}>{completed}/{allDocs.length}</Text>
        </View>

        <TouchableOpacity
          style={styles.expiryBanner}
          onPress={() => navigation.navigate('DocumentExpiry')}
          activeOpacity={0.85}
        >
          <View style={styles.expiryIcon}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.expiryTitle}>Track Document Expiry Dates</Text>
            <Text style={styles.expirySub}>Green card, passport, EAD & more — get reminded before they expire</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
        </TouchableOpacity>

        {legacyCount > 0 && (
          <View style={styles.reuploadBanner}>
            <View style={styles.reuploadIcon}>
              <Ionicons name="warning-outline" size={20} color="#9A7300" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reuploadTitle}>
                {legacyCount === 1 ? '1 photo needs re-uploading' : `${legacyCount} photos need re-uploading`}
              </Text>
              <Text style={styles.reuploadSub}>
                Saved before we moved to secure storage — those files were never actually kept. Tap the marked document below to re-add it.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#BDC3C7" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents..."
            placeholderTextColor="#BDC3C7"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#BDC3C7" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : currentDocs.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#BDC3C7', marginTop: 24, fontSize: 13 }}>
            No documents match "{search}"
          </Text>
        ) : (
          currentDocs.map((docName) => {
            const doc       = docs[docName];
            const checked   = doc?.checked ?? false;
            const photoPath = doc?.photo_uri ?? null;
            const needsReupload = isLocalUri(photoPath);
            const signedUrl = photoPath && !needsReupload ? signedUrls[photoPath] : null;
            const isUploading = uploadingDoc === docName;
            return (
              <View key={docName} style={styles.docRow}>
                <TouchableOpacity
                  style={[styles.checkbox, { borderColor: checked ? colors.primary : '#ccc', backgroundColor: checked ? colors.primary : '#fff' }]}
                  onPress={() => toggleCheck(docName)}
                  activeOpacity={0.8}
                >
                  {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <GlossaryText style={[styles.docName, { color: checked ? colors.textSecondary : colors.text }, checked && styles.docNameDone]}>
                    {docName}
                  </GlossaryText>
                  <StatusBadge
                    style={{ marginTop: 4 }}
                    label={needsReupload ? 'Needs re-upload' : checked ? 'Uploaded' : 'Missing'}
                    tone={needsReupload ? 'warning' : checked ? 'success' : 'warning'}
                  />
                </View>
                {isUploading ? (
                  <View style={styles.cameraBtn}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : needsReupload ? (
                  <TouchableOpacity style={styles.reuploadBtn} onPress={() => pickPhoto(docName)} activeOpacity={0.8}>
                    <Ionicons name="warning-outline" size={18} color="#9A7300" />
                  </TouchableOpacity>
                ) : photoPath ? (
                  <TouchableOpacity onPress={() => pickPhoto(docName)}>
                    {signedUrl
                      ? <Image source={{ uri: signedUrl }} style={styles.thumbnail} />
                      : <View style={styles.thumbnail} />}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.cameraBtn} onPress={() => pickPhoto(docName)} activeOpacity={0.8}>
                    <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
