import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTestVersion } from '../context/TestVersionContext';
import { useAuth } from '../context/AuthContext';
import DragHandle from './DragHandle';
import { TYPOGRAPHY } from '../theme';

const OPTIONS = [
  {
    value: '2008',
    icon: 'calendar-outline',
    label: 'I filed before October 20, 2025',
    sub: '100 questions · Pass 6 out of 10 (2008 test)',
    color: '#1B5E20',
    bg: '#E8F5E9',
  },
  {
    value: '2025',
    icon: 'star-outline',
    label: 'I filed on or after October 20, 2025',
    sub: '128 questions · Pass 12 out of 20 (2025 test)',
    color: '#1565C0',
    bg: '#E3F2FD',
  },
  {
    value: 'unsure',
    icon: 'help-circle-outline',
    label: "I'm not sure yet",
    sub: 'See all 128 questions · 2025-only questions flagged',
    color: '#E65100',
    bg: '#FFF3E0',
  },
];

export default function TestVersionModal({ visible, onDismiss }) {
  const { setTestVersion } = useTestVersion();
  const { updateProfile }  = useAuth();

  const handleSelect = async (value) => {
    await setTestVersion(value);
    updateProfile({ civics_test_version: value }).catch(() => {});
    onDismiss?.();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <DragHandle />
          <Text style={styles.title}>Which civics test are you taking?</Text>
          <Text style={styles.sub}>
            Your N-400 filing date determines which version of the test you will take at your interview.
          </Text>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.option, { backgroundColor: opt.bg }]}
              onPress={() => handleSelect(opt.value)}
              activeOpacity={0.85}
            >
              <View style={[styles.optIcon, { backgroundColor: opt.color + '20' }]}>
                <Ionicons name={opt.icon} size={24} color={opt.color} />
              </View>
              <View style={styles.optRight}>
                <Text style={[styles.optLabel, { color: opt.color }]}>{opt.label}</Text>
                <Text style={styles.optSub}>{opt.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={opt.color} />
            </TouchableOpacity>
          ))}
          <Text style={styles.disclaimer}>
            Questions based on official USCIS content. Always verify at uscis.gov for the most current information.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12 },
  title:      { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, lineHeight: TYPOGRAPHY.displayLineHeight, color: '#1a1a2e', marginBottom: 2 },
  sub:        { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 4 },
  option:     { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, gap: 12 },
  optIcon:    { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optRight:   { flex: 1 },
  optLabel:   { fontSize: 15, fontWeight: '800', lineHeight: 22 },
  optSub:     { fontSize: 13, color: '#666', marginTop: 2 },
  disclaimer: { fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 16, marginTop: 4, marginBottom: 8 },
});
