import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export function SectionHeader({ icon, iconBg, iconColor, title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.sectionMeta}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      </View>
    </View>
  );
}

export function RowLink({ icon, label, onPress, iconColor = '#666', value, destructive }) {
  const labelColor = destructive ? '#ef4444' : undefined;
  return (
    <TouchableOpacity style={styles.rowLink} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={destructive ? '#ef4444' : iconColor} />
      <Text style={[styles.rowLinkLabel, labelColor ? { color: labelColor } : {}]}>{label}</Text>
      {!!value && <Text style={styles.rowValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={15} color={destructive ? '#ef4444' : '#bbb'} />
    </TouchableOpacity>
  );
}

export function RowToggle({ icon, label, subtitle, value, onValueChange, iconColor = '#666', trackActiveColor }) {
  return (
    <View style={styles.rowToggle}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={styles.rowToggleBody}>
        <Text style={styles.rowToggleLabel}>{label}</Text>
        {!!subtitle && <Text style={styles.rowToggleSub}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e0e0e0', true: (trackActiveColor || COLORS.primary + '80') }}
        thumbColor={value ? (trackActiveColor?.replace('80', '') || COLORS.primary) : '#bbb'}
        ios_backgroundColor="#e0e0e0"
      />
    </View>
  );
}

export const rowStyles = StyleSheet.create({
  section:       { borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff' },
  divider:       { height: 1, backgroundColor: '#f0f0f0', marginLeft: 20 },
});

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, paddingBottom: 12 },
  sectionIcon:   { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sectionMeta:   { flex: 1 },
  sectionTitle:  { fontSize: 18, fontWeight: '800', color: '#111' },
  sectionSub:    { fontSize: 14, color: '#888', marginTop: 2 },

  rowLink:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12, minHeight: 56 },
  rowLinkLabel: { flex: 1, fontSize: 17, fontWeight: '600', color: '#111' },
  rowValue:     { fontSize: 15, color: '#888' },

  rowToggle:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, minHeight: 56 },
  rowToggleBody: { flex: 1 },
  rowToggleLabel:{ fontSize: 17, fontWeight: '600', color: '#111' },
  rowToggleSub:  { fontSize: 14, color: '#888', marginTop: 2 },
});
