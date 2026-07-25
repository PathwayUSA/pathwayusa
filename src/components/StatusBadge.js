import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Shared status-pill vocabulary so DocumentsScreen/DeadlinesScreen/CaseTrackerScreen
// use one consistent visual language instead of each screen inventing its own.
const TONES = {
  success: { bg: '#E8F5E9', fg: '#2E7D32', icon: 'checkmark-circle' },
  warning: { bg: '#FFF3E0', fg: '#E65100', icon: 'alert-circle' },
  danger:  { bg: '#FFEBEE', fg: '#C62828', icon: 'close-circle' },
  info:    { bg: '#E3F2FD', fg: '#1565C0', icon: 'time-outline' },
  neutral: { bg: '#F5F5F5', fg: '#757575', icon: 'ellipse-outline' },
};

export default function StatusBadge({ label, tone = 'neutral', icon, style }) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      <Ionicons name={icon ?? t.icon} size={12} color={t.fg} />
      <Text style={[styles.txt, { color: t.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  txt:  { fontSize: 11, fontWeight: '700' },
});
