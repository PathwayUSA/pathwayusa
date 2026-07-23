import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProBadge({ small = false }) {
  return (
    <View style={[styles.badge, small && styles.badgeSmall]}>
      <Ionicons name="star" size={small ? 8 : 10} color="#FFD700" />
      <Text style={[styles.txt, small && styles.txtSmall]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#0F2A3D', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  badgeSmall: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  txt:        { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  txtSmall:   { fontSize: 8 },
});
