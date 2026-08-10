import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { SHADOWS } from '../theme';
import { lightHaptic } from '../utils/haptics';

// react-native-maps has no web build (it imports native-only codegen internals),
// so this .web.js variant replaces the pin map with a plain list — Metro picks
// this file automatically on web and the native ResourceMapScreen.js otherwise.
// Same route contract (route.params.resources), same screen name in App.js.

const CATEGORY_COLORS = {
  Legal:     { color: '#1565c0', bg: '#e3f2fd' },
  Medical:   { color: '#c62828', bg: '#ffebee' },
  Housing:   { color: '#e65100', bg: '#fff3e0' },
  Education: { color: '#2e7d32', bg: '#e8f5e9' },
};

const CATEGORY_FILTERS = [
  { id: 'Legal',     label: 'Legal Aid', icon: 'briefcase' },
  { id: 'Medical',   label: 'Health',    icon: 'medkit' },
  { id: 'Housing',   label: 'Housing',   icon: 'home' },
  { id: 'Education', label: 'Education', icon: 'school' },
];

export default function ResourceMapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const allResources = route.params?.resources ?? [];
  const [activeCategory, setActiveCategory] = useState(null);

  const visibleResources = activeCategory
    ? allResources.filter((r) => r.category === activeCategory)
    : allResources;
  const availableCategories = new Set(allResources.map((r) => r.category));

  const cat = (id) => CATEGORY_COLORS[id] ?? { color: colors.primary, bg: colors.primaryLight };

  const openDirections = (address) => {
    lightHaptic();
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://maps.google.com/?q=${encoded}`).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Resources</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.chipRow}>
        {CATEGORY_FILTERS.filter((c) => availableCategories.has(c.id)).map((c) => {
          const active = activeCategory === c.id;
          const catStyle = cat(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, active && { backgroundColor: catStyle.color, borderColor: catStyle.color }]}
              onPress={() => { lightHaptic(); setActiveCategory(active ? null : c.id); }}
              activeOpacity={0.8}
            >
              <Ionicons name={c.icon} size={13} color={active ? '#fff' : catStyle.color} />
              <Text style={[styles.chipTxt, { color: active ? '#fff' : catStyle.color }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={15} color="#7F8C8D" />
        <Text style={styles.infoTxt}>
          Map view isn't available on web yet — showing resources as a list instead.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}>
        {visibleResources.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName} numberOfLines={2}>{r.name}</Text>
              <View style={[styles.badge, { backgroundColor: cat(r.category).bg }]}>
                <Text style={[styles.badgeTxt, { color: cat(r.category).color }]}>{r.category}</Text>
              </View>
            </View>
            {r.address ? <Text style={styles.cardAddress}>{r.address}</Text> : null}
            {r.distanceMi != null && <Text style={styles.distanceTxt}>{r.distanceMi} mi away</Text>}
            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: colors.primary }]}
              onPress={() => openDirections(r.address)}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={15} color="#fff" />
              <Text style={styles.cardBtnTxt}>Directions</Text>
            </TouchableOpacity>
          </View>
        ))}
        {visibleResources.length === 0 && (
          <Text style={styles.emptyTxt}>No resources in this category.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', zIndex: 10,
    ...SHADOWS.small,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#1A1A2E' },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', zIndex: 9,
    ...SHADOWS.small,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E8ECE8', backgroundColor: '#fff',
  },
  chipTxt: { fontSize: 12, fontWeight: '700' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F5F7F5',
  },
  infoTxt: { fontSize: 12, color: '#7F8C8D', flex: 1, lineHeight: 17 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 6,
    ...SHADOWS.small,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardName: { flex: 1, fontSize: 15, fontWeight: '900', color: '#1A1A2E' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  cardAddress: { fontSize: 13, color: '#555' },
  distanceTxt: { fontSize: 13, color: '#7F8C8D' },
  cardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, height: 40, marginTop: 4,
  },
  cardBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  emptyTxt: { textAlign: 'center', color: '#7F8C8D', marginTop: 24 },
});
