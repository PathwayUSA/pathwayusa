import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Dimensions, ActivityIndicator, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { lightHaptic } from '../utils/haptics';
import { ONBOARDING_DATA_KEY } from './onboarding/IntakeStack';
import { useLanguage } from '../i18n';

const { width } = Dimensions.get('window');

const SAVED_RESOURCES_KEY = '@pathwayusa/saved_resources';

const DISTANCE_OPTIONS = [5, 10, 25, 50];

const CATEGORIES = [
  { id: 'Legal',      label: 'Legal Aid',   icon: 'briefcase' },
  { id: 'Medical',    label: 'Health',      icon: 'medkit' },
  { id: 'Housing',    label: 'Housing',     icon: 'home' },
  { id: 'Education',  label: 'Education',   icon: 'school' },
];

// Orlando-area placeholder data (lat/lng are approximate for map pins)
const PLACEHOLDER_RESOURCES = [
  {
    id: 'r1', name: 'Legal Aid Society of Central Florida', category: 'Legal',
    address: '100 E Robinson St, Orlando, FL 32801',
    phone: '(407) 841-8310', hours: 'Mon–Fri 9AM–5PM',
    description: 'Free legal assistance for immigrants and low-income families in Orange County.',
    rating: 4.7, reviewCount: 128, distanceMi: 1.2,
    lat: 28.5386, lng: -81.3736,
  },
  {
    id: 'r2', name: 'Catholic Charities of Central Florida', category: 'Legal',
    address: '1771 N Semoran Blvd, Orlando, FL 32807',
    phone: '(407) 658-1818', hours: 'Mon–Fri 8:30AM–4:30PM',
    description: 'Immigration legal services: DACA renewals, naturalization, green card assistance.',
    rating: 4.8, reviewCount: 96, distanceMi: 2.4,
    lat: 28.5535, lng: -81.3177,
  },
  {
    id: 'r3', name: 'AdventHealth Immigrant Health Center', category: 'Medical',
    address: '601 E Rollins St, Orlando, FL 32803',
    phone: '(407) 303-7711', hours: 'Mon–Sat 8AM–6PM',
    description: 'Affordable health services for immigrants regardless of insurance status.',
    rating: 4.6, reviewCount: 74, distanceMi: 0.8,
    lat: 28.5565, lng: -81.3781,
  },
  {
    id: 'r4', name: 'YMCA Immigrant Education Program', category: 'Education',
    address: '1110 W Church St, Orlando, FL 32805',
    phone: '(407) 426-9496', hours: 'Mon–Thu 9AM–7PM',
    description: 'English classes, citizenship prep, and GED programs for adult immigrants.',
    rating: 4.5, reviewCount: 51, distanceMi: 3.1,
    lat: 28.5417, lng: -81.3949,
  },
  {
    id: 'r5', name: 'Coalition for the Homeless of Central FL', category: 'Housing',
    address: '639 W Central Blvd, Orlando, FL 32801',
    phone: '(407) 426-1250', hours: 'Mon–Fri 8AM–5PM',
    description: 'Emergency shelter, transitional housing, and rental assistance for immigrant families.',
    rating: 4.3, reviewCount: 42, distanceMi: 1.9,
    lat: 28.5398, lng: -81.3954,
  },
  {
    id: 'r6', name: 'Aspire Health Partners', category: 'Medical',
    address: '4300 S Semoran Blvd, Orlando, FL 32822',
    phone: '(407) 875-3700', hours: 'Mon–Fri 8AM–5PM',
    description: 'Mental health services in multiple languages for the immigrant community.',
    rating: 4.4, reviewCount: 33, distanceMi: 4.7,
    lat: 28.4971, lng: -81.3171,
  },
  {
    id: 'r7', name: 'Rollins College Immigrant Voices Project', category: 'Education',
    address: '1000 Holt Ave, Winter Park, FL 32789',
    phone: '(407) 646-2000', hours: 'Mon–Fri 10AM–4PM',
    description: 'Scholarship guidance and academic resources for immigrant students.',
    rating: 4.6, reviewCount: 28, distanceMi: 5.8,
    lat: 28.5985, lng: -81.3389,
  },
  {
    id: 'r8', name: 'Orange County Housing & Community Dev.', category: 'Housing',
    address: '525 E South St, Orlando, FL 32801',
    phone: '(407) 836-5150', hours: 'Mon–Fri 8AM–5PM',
    description: 'Rental assistance, down payment help, and housing counseling for low-income families.',
    rating: 4.2, reviewCount: 67, distanceMi: 1.5,
    lat: 28.5330, lng: -81.3786,
  },
];

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7F5' },

    // Header
    header: { paddingHorizontal: 20, paddingBottom: 24 },
    headerTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    headerTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#fff', lineHeight: TYPOGRAPHY.displayLineHeight },
    headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.78)', marginTop: 6, lineHeight: 20 },
    mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
    mapBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // Search bar
    searchWrap: { marginHorizontal: 20, marginTop: -22, backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, height: 52, ...SHADOWS.medium, zIndex: 10 },
    searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E' },

    // Legal entry point
    legalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 14, backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOWS.small },
    legalIconWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    legalRowTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
    legalRowSub: { fontSize: 11.5, color: '#7F8C8D', marginTop: 2, lineHeight: 15 },

    // Distance chips
    distanceRow: { paddingHorizontal: 20, marginTop: 18 },
    distanceLabel: { fontSize: 13, fontWeight: '700', color: '#7F8C8D', marginBottom: 10 },
    chipScroll: { flexDirection: 'row', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8ECE8', backgroundColor: '#fff' },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipTxt: { fontSize: 14, fontWeight: '700', color: '#7F8C8D' },
    chipTxtActive: { color: '#fff' },

    // Categories
    catSection: { paddingHorizontal: 20, marginTop: 22 },
    catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    catTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, color: '#1A1A2E' },
    catSeeAll: { fontSize: 14, fontWeight: '700', color: colors.primary },
    catGrid: { flexDirection: 'row', gap: 10 },
    catTile: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: '#fff', ...SHADOWS.small },
    catIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    catLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },

    // Context banner
    contextBanner: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.primaryLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    contextTxt: { fontSize: 12, color: colors.primaryDark, fontWeight: '600', flex: 1, lineHeight: 18 },

    // Resources list
    resultsSection: { paddingHorizontal: 20, marginTop: 22 },
    resultsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    resultsTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, color: '#1A1A2E', flex: 1 },
    savedToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary },
    savedToggleActive: { backgroundColor: colors.primary },
    savedToggleTxt: { fontSize: 12, fontWeight: '700', color: colors.primary },
    savedToggleTxtActive: { color: '#fff' },

    // Resource card
    resourceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, gap: 10, ...SHADOWS.small },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardName: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', flex: 1, marginRight: 8 },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    categoryBadgeTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ratingTxt: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
    ratingCount: { fontSize: 12, color: '#7F8C8D' },
    distanceTxt: { fontSize: 12, color: '#7F8C8D' },
    descTxt: { fontSize: 13, color: '#555', lineHeight: 20 },
    hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    hoursTxt: { fontSize: 12, color: '#7F8C8D' },
    cardActionsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
    callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, height: 38 },
    callBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
    dirBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.5, borderColor: '#E8ECE8', borderRadius: 10, height: 38, paddingHorizontal: 14 },
    dirBtnTxt: { fontSize: 13, fontWeight: '700', color: '#7F8C8D' },

    // Load more
    loadMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, height: 48, marginBottom: 12, ...SHADOWS.small },
    loadMoreTxt: { fontSize: 14, fontWeight: '700', color: colors.primary },
  });
}

// One neutral treatment for every category — the color used to encode
// which category a resource belonged to carried no real meaning.
function getCategoryStyle(catId, primary, primaryLight) {
  return { bg: primaryLight, color: primary };
}

export default function ResourcesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [search, setSearch] = useState('');
  const [distance, setDistance] = useState(5);
  const [activeCategory, setActiveCategory] = useState(null);
  const [resources, setResources] = useState(PLACEHOLDER_RESOURCES);
  const [loadingDB, setLoadingDB] = useState(false);
  const [showCount, setShowCount] = useState(3);
  const [intakeData, setIntakeData] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DATA_KEY)
      .then((raw) => { if (raw) setIntakeData(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(SAVED_RESOURCES_KEY)
      .then((raw) => { if (raw) setSavedIds(new Set(JSON.parse(raw))); })
      .catch(() => {});
  }, []);

  const toggleSaved = useCallback((id) => {
    lightHaptic();
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      AsyncStorage.setItem(SAVED_RESOURCES_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
  }, []);

  // Try to fetch from Supabase; fall back to placeholder
  useEffect(() => {
    if (!user) return;
    setLoadingDB(true);
    supabase
      .from('resources')
      .select('id, name, category, address, phone, hours, description, rating, review_count, distance_mi')
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data?.length > 0) {
          setResources(data.map((r) => ({ ...r, distanceMi: r.distance_mi ?? 99, reviewCount: r.review_count ?? 0 })));
        }
        setLoadingDB(false);
      })
      .catch(() => setLoadingDB(false));
  }, [user]);

  // Contextual banner: map pathway to category
  const pathwayType = intakeData?.pathway_type ?? profile?.pathway_type ?? null;
  const contextCategory = pathwayType === 'A' || pathwayType === 'C' || pathwayType === 'E'
    ? 'Legal'
    : pathwayType === 'D'
    ? 'Legal'
    : null;

  const contextBannerTxt = contextCategory
    ? `Based on your current step, you may need ${contextCategory === 'Legal' ? 'Legal Aid' : contextCategory} near you.`
    : null;

  const filtered = useMemo(() => {
    let list = resources.filter((r) => r.distanceMi <= distance);
    if (activeCategory) list = list.filter((r) => r.category === activeCategory);
    if (showSavedOnly) list = list.filter((r) => savedIds.has(r.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.distanceMi - b.distanceMi);
  }, [resources, distance, activeCategory, showSavedOnly, savedIds, search]);

  const handleCall = useCallback((phone) => {
    if (!phone) return;
    lightHaptic();
    Linking.openURL(`tel:${phone.replace(/[^\d]/g, '')}`).catch(() => {});
  }, []);

  const handleDirections = useCallback((address) => {
    if (!address) return;
    lightHaptic();
    const url = `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {});
  }, []);

  const visible = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── HEADER ── */}
        <LinearGradient
          colors={colors.gradient}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
          start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}
        >
          <View style={styles.headerTopBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t('res_header_title')}</Text>
              <Text style={styles.headerSub}>{t('res_header_sub')}</Text>
            </View>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => { lightHaptic(); navigation.navigate('ResourceMap', { resources: filtered }); }}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={14} color="#fff" />
              <Text style={styles.mapBtnTxt}>Map View</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── SEARCH BAR ── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#BDC3C7" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('res_city_zip')}
            placeholderTextColor="#BDC3C7"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#BDC3C7" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── LEGAL ENTRY POINT — paid attorney option, alongside free resources ── */}
        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => { lightHaptic(); navigation.navigate('Legal'); }}
          activeOpacity={0.85}
        >
          <View style={styles.legalIconWrap}>
            <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.legalRowTitle}>Talk to a Licensed Attorney</Text>
            <Text style={styles.legalRowSub}>Paid — for complex cases. Free legal aid is listed below.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
        </TouchableOpacity>

        {/* ── DISTANCE FILTER ── */}
        <View style={styles.distanceRow}>
          <Text style={styles.distanceLabel}>{t('res_distance_label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {DISTANCE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, distance === d && styles.chipActive]}
                onPress={() => { lightHaptic(); setDistance(d); setShowCount(3); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipTxt, distance === d && styles.chipTxtActive]}>
                  {d} mi
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── POPULAR CATEGORIES ── */}
        <View style={styles.catSection}>
          <View style={styles.catHeader}>
            <Text style={styles.catTitle}>Popular Categories</Text>
            {activeCategory && (
              <TouchableOpacity onPress={() => { lightHaptic(); setActiveCategory(null); setShowCount(3); }} activeOpacity={0.8}>
                <Text style={styles.catSeeAll}>See all</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catTile, isActive && { borderWidth: 2, borderColor: colors.primary }]}
                  onPress={() => { lightHaptic(); setActiveCategory(isActive ? null : cat.id); setShowCount(3); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: isActive ? colors.primary : colors.border }]}>
                    <Ionicons name={cat.icon} size={22} color={isActive ? '#fff' : colors.textSecondary} />
                  </View>
                  <Text style={[styles.catLabel, isActive && { color: colors.primary }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Contextual banner ── */}
        {contextBannerTxt && !activeCategory && (
          <View style={styles.contextBanner}>
            <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            <Text style={styles.contextTxt}>{contextBannerTxt}</Text>
          </View>
        )}

        {/* ── RESULTS ── */}
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeaderRow}>
            <Text style={styles.resultsTitle}>
              {activeCategory
                ? `${CATEGORIES.find((c) => c.id === activeCategory)?.label ?? activeCategory} Near You`
                : 'Top Resources Near You'}
              {loadingDB && <ActivityIndicator color={colors.primary} size="small" style={{ marginLeft: 8 }} />}
            </Text>
            <TouchableOpacity
              style={[styles.savedToggle, showSavedOnly && styles.savedToggleActive]}
              onPress={() => { lightHaptic(); setShowSavedOnly((v) => !v); setShowCount(3); }}
              activeOpacity={0.8}
            >
              <Ionicons name={showSavedOnly ? 'bookmark' : 'bookmark-outline'} size={13} color={showSavedOnly ? '#fff' : colors.primary} />
              <Text style={[styles.savedToggleTxt, showSavedOnly && styles.savedToggleTxtActive]}>Saved</Text>
            </TouchableOpacity>
          </View>

          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
              <Ionicons name={showSavedOnly ? 'bookmark-outline' : 'search-outline'} size={40} color="#BDC3C7" />
              <Text style={{ fontSize: 15, color: '#BDC3C7', fontWeight: '600' }}>
                {showSavedOnly ? 'No saved resources yet' : 'No results found'}
              </Text>
              <Text style={{ fontSize: 13, color: '#BDC3C7', textAlign: 'center', lineHeight: 19 }}>
                {showSavedOnly ? 'Tap the bookmark on a resource to save it here.' : 'Try a wider distance or a different category.'}
              </Text>
            </View>
          ) : (
            <>
              {visible.map((resource) => {
                const catStyle = getCategoryStyle(resource.category, colors.primary, colors.primaryLight);
                return (
                  <View key={resource.id} style={styles.resourceCard}>

                    {/* Top row: name + bookmark */}
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardName} numberOfLines={2}>{resource.name}</Text>
                      <TouchableOpacity
                        onPress={() => toggleSaved(resource.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={savedIds.has(resource.id) ? 'bookmark' : 'bookmark-outline'}
                          size={20}
                          color={savedIds.has(resource.id) ? colors.primary : '#BDC3C7'}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Category badge */}
                    <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.categoryBadgeTxt, { color: catStyle.color }]}>
                        {resource.category?.toUpperCase() ?? 'RESOURCE'}
                      </Text>
                    </View>

                    {/* Rating + distance */}
                    <View style={styles.ratingRow}>
                      <Text style={{ fontSize: 13 }}>⭐</Text>
                      <Text style={styles.ratingTxt}>{resource.rating?.toFixed(1) ?? '4.5'}</Text>
                      <Text style={styles.ratingCount}>({resource.reviewCount})</Text>
                      <Text style={{ color: '#BDC3C7' }}>·</Text>
                      <Ionicons name="location-outline" size={13} color="#7F8C8D" />
                      <Text style={styles.distanceTxt}>{resource.distanceMi?.toFixed(1)} mi away</Text>
                    </View>

                    {/* Description */}
                    <Text style={styles.descTxt} numberOfLines={2}>{resource.description}</Text>

                    {/* Hours */}
                    <View style={styles.hoursRow}>
                      <Ionicons name="time-outline" size={13} color="#7F8C8D" />
                      <Text style={styles.hoursTxt}>{resource.hours ?? 'Call for hours'}</Text>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => handleCall(resource.phone)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="call" size={15} color="#fff" />
                        <Text style={styles.callBtnTxt}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dirBtn}
                        onPress={() => handleDirections(resource.address)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="navigate-outline" size={15} color="#7F8C8D" />
                        <Text style={styles.dirBtnTxt}>Directions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => { lightHaptic(); setShowCount((n) => n + 3); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-down" size={16} color={colors.primary} />
                  <Text style={styles.loadMoreTxt}>
                    Load more ({filtered.length - showCount} remaining)
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
