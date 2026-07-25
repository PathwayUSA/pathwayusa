import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator,
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

    docRow: {
      backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
      flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOWS.small,
    },
    checkbox:    { width: 26, height: 26, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    docName:     { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },
    docNameDone: { textDecorationLine: 'line-through' },
    thumbnail:   { width: 40, height: 40, borderRadius: 8, flexShrink: 0 },
    cameraBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  });
}

export default function DocumentsScreen() {
  const { colors }  = useTheme();
  const { user }    = useAuth();
  const { isPro }   = useSubscription();
  const insets      = useSafeAreaInsets();
  const styles      = useMemo(() => makeStyles(colors), [colors]);

  const [selectedPath, setSelectedPath] = useState(PATH_KEYS[0]);
  const [docs, setDocs]   = useState({});
  const [loading, setLoading] = useState(true);

  const loadDocs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', user.id);
    const map = {};
    (data ?? []).forEach((d) => { map[d.document_name] = d; });
    setDocs(map);
    setLoading(false);
  }, [user]);

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
    const uri = result.assets[0].uri;
    const existing = docs[docName];
    if (existing) {
      await supabase.from('user_documents').update({ photo_uri: uri, checked: true }).eq('id', existing.id);
      setDocs((prev) => ({ ...prev, [docName]: { ...prev[docName], photo_uri: uri, checked: true } }));
    } else {
      const { data } = await supabase
        .from('user_documents')
        .insert({ user_id: user.id, document_name: docName, checked: true, photo_uri: uri })
        .select().single();
      if (data) setDocs((prev) => ({ ...prev, [docName]: data }));
    }
  };

  const currentDocs = PATHS[selectedPath] ?? [];
  const completed   = currentDocs.filter((d) => docs[d]?.checked).length;
  const pct         = currentDocs.length > 0 ? completed / currentDocs.length : 0;

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
          <Text style={styles.progressTxt}>{completed}/{currentDocs.length}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          currentDocs.map((docName) => {
            const doc     = docs[docName];
            const checked = doc?.checked ?? false;
            const photo   = doc?.photo_uri ?? null;
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
                    label={checked ? 'Uploaded' : 'Missing'}
                    tone={checked ? 'success' : 'warning'}
                  />
                </View>
                {photo ? (
                  <TouchableOpacity onPress={() => pickPhoto(docName)}>
                    <Image source={{ uri: photo }} style={styles.thumbnail} />
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
