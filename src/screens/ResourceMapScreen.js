import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { SHADOWS } from '../theme';
import { lightHaptic } from '../utils/haptics';

// Default center: Orlando, FL
const DEFAULT_REGION = {
  latitude: 28.5384,
  longitude: -81.3789,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const CATEGORY_COLORS = {
  Legal:     { color: '#1565c0', bg: '#e3f2fd' },
  Medical:   { color: '#c62828', bg: '#ffebee' },
  Housing:   { color: '#e65100', bg: '#fff3e0' },
  Education: { color: '#2e7d32', bg: '#e8f5e9' },
};

// Only resources with lat/lng are pinned. Supabase resources without coordinates
// appear in the list view only — add lat/lng columns to the resources table when
// geocoding is wired up.

export default function ResourceMapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const mapRef = useRef(null);

  const allResources = route.params?.resources ?? [];
  const pinnable = allResources.filter((r) => r.lat != null && r.lng != null);

  const [selectedResource, setSelectedResource] = useState(null);
  const [region, setRegion] = useState(DEFAULT_REGION);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (status !== 'granted') return;
        return Location.getCurrentPositionAsync({});
      })
      .then((loc) => {
        if (!loc) return;
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        });
      })
      .catch(() => {});
  }, []);

  const openDirections = (address) => {
    lightHaptic();
    const encoded = encodeURIComponent(address);
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${encoded}`
      : `https://maps.google.com/?q=${encoded}`;
    Linking.openURL(url).catch(() => {});
  };

  const cat = (id) => CATEGORY_COLORS[id] ?? { color: colors.primary, bg: colors.primaryLight };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Map View</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info strip when no pins available (Supabase resources lack coordinates) */}
      {pinnable.length === 0 && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={15} color="#7F8C8D" />
          <Text style={styles.infoTxt}>
            Showing area map. Tap a marker after selecting a local resource.
          </Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        showsUserLocation
        showsMyLocationButton
      >
        {pinnable.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            pinColor={cat(r.category).color}
            onPress={() => { lightHaptic(); setSelectedResource(r); }}
          />
        ))}
      </MapView>

      {/* Bottom card for the selected marker */}
      {selectedResource && (
        <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedResource(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={18} color="#888" />
          </TouchableOpacity>

          <Text style={styles.cardName} numberOfLines={2}>{selectedResource.name}</Text>

          <View style={[styles.badge, { backgroundColor: cat(selectedResource.category).bg }]}>
            <Text style={[styles.badgeTxt, { color: cat(selectedResource.category).color }]}>
              {selectedResource.category}
            </Text>
          </View>

          {selectedResource.distanceMi != null && (
            <Text style={styles.distanceTxt}>{selectedResource.distanceMi} mi away</Text>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: colors.primary }]}
              onPress={() => openDirections(selectedResource.address)}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={15} color="#fff" />
              <Text style={styles.cardBtnTxt}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cardBtn, styles.cardBtnOutline, { borderColor: colors.primary }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="list" size={15} color={colors.primary} />
              <Text style={[styles.cardBtnTxt, { color: colors.primary }]}>View List</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff',
    zIndex: 10,
    ...SHADOWS.small,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#1A1A2E' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F5F7F5',
  },
  infoTxt: { fontSize: 12, color: '#7F8C8D', flex: 1, lineHeight: 17 },
  map: { flex: 1 },
  bottomCard: {
    backgroundColor: '#fff',
    padding: 20,
    gap: 8,
    ...SHADOWS.medium,
  },
  closeBtn: { position: 'absolute', top: 14, right: 16 },
  cardName: { fontSize: 16, fontWeight: '900', color: '#1A1A2E', paddingRight: 32 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  distanceTxt: { fontSize: 13, color: '#7F8C8D' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cardBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, height: 44,
  },
  cardBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5 },
  cardBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
