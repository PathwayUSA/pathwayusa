import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { lightHaptic, mediumHaptic } from '../utils/haptics';
import { ONBOARDING_DATA_KEY } from './onboarding/IntakeStack';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVY = '#0F2A3D';
const TEAL = '#2A8B7A';
const GOLD = '#F5A623';

const TRUST_SIGNALS = [
  { icon: 'lock-closed',        label: 'Secure &\nPrivate',   sub: 'Your data is protected', color: NAVY },
];

const WHY_CONNECT = [
  'Get professional legal advice tailored to your case',
  'Avoid costly mistakes on your immigration forms',
  'Direct messaging with your attorney in the app',
  'See updates from your attorney in the app',
];

const HOW_IT_WORKS = [
  { num: '1', label: 'Select an\nAttorney' },
  { num: '2', label: 'Share Your\nCase' },
  { num: '3', label: 'Get Expert\nGuidance' },
];

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7F5' },

    // Header
    header: { paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
    headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 21, maxWidth: 280 },

    // Trust row
    trustRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 20, ...SHADOWS.small },
    trustCol: { flex: 1, alignItems: 'center', gap: 6 },
    trustDivider: { width: 1, backgroundColor: '#E8ECE8' },
    trustIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    trustLabel: { fontSize: 12, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', lineHeight: 17 },
    trustSub: { fontSize: 10, color: '#7F8C8D', textAlign: 'center', lineHeight: 14 },

    // Section card
    sectionCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 14, ...SHADOWS.small },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1A1A2E' },

    // Why connect bullets
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    bulletDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL, marginTop: 7, flexShrink: 0 },
    bulletTxt: { fontSize: 14, color: '#444', lineHeight: 22, flex: 1 },

    // How it works
    howRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 0 },
    howStep: { flex: 1, alignItems: 'center', gap: 8 },
    howNum: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
    howNumTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },
    howLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', lineHeight: 17 },
    howConnector: { flex: 0, width: 32, height: 2, backgroundColor: TEAL + '30', marginTop: 19 },

    // CTA
    ctaBtn: { marginHorizontal: 20, marginTop: 24, backgroundColor: GOLD, borderRadius: 16, height: 58, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, ...SHADOWS.medium },
    ctaTxt: { fontSize: 17, fontWeight: '900', color: '#fff' },

    // Active case card
    caseCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 16, borderLeftWidth: 4, borderLeftColor: colors.primary, padding: 20, gap: 14, ...SHADOWS.small },
    caseLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
    caseName: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
    caseFirm: { fontSize: 13, color: '#7F8C8D' },
    caseStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    caseStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27AE60' },
    caseStatusTxt: { fontSize: 13, fontWeight: '700', color: '#27AE60' },
    msgBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 12, height: 48 },
    msgBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, height: 44, borderWidth: 1.5, borderColor: '#E8ECE8' },
    secondaryBtnTxt: { fontSize: 14, fontWeight: '700', color: '#7F8C8D' },

    // Contextual banner
    contextBanner: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.primaryLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    contextBannerTxt: { fontSize: 13, color: colors.primaryDark, fontWeight: '600', flex: 1, lineHeight: 19 },
  });
}

export default function LegalPortalScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeCase, setActiveCase] = useState(null);
  const [intakeData, setIntakeData] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DATA_KEY)
      .then((raw) => { if (raw) setIntakeData(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('attorney_clients')
      .select('id, status, attorney_id, created_at, attorneys(name, firm, specialty)')
      .eq('user_id', user.id)
      .in('status', ['active', 'accepted'])
      .maybeSingle()
      .then(({ data }) => {
        setActiveCase(data ?? null);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [user]);

  // Contextual tip based on pathway
  const pathwayType = intakeData?.pathway_type ?? profile?.pathway_type ?? null;
  const contextTip = pathwayType
    ? `Based on your pathway, attorneys who specialize in ${
        pathwayType === 'A' ? 'TPS & Adjustment of Status' :
        pathwayType === 'B' ? 'Student Visas & OPT' :
        pathwayType === 'C' ? 'Work Visas & Green Cards' :
        pathwayType === 'D' || pathwayType === 'E' ? 'Naturalization' :
        pathwayType === 'F' ? 'Family Petitions' :
        'Immigration'
      } are highlighted for you.`
    : null;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7F5' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <LinearGradient
          colors={colors.gradient}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
          start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}
        >
          <Text style={styles.headerTitle}>Attorney Portal</Text>
          <Text style={styles.headerSub}>
            Manage your case with a verified immigration attorney.
          </Text>
        </LinearGradient>

        {/* ── TRUST SIGNALS ROW ── */}
        <View style={styles.trustRow}>
          {TRUST_SIGNALS.map((signal, i) => (
            <React.Fragment key={signal.label}>
              {i > 0 && <View style={styles.trustDivider} />}
              <View style={styles.trustCol}>
                <View style={[styles.trustIconWrap, { backgroundColor: (signal.color ?? colors.primary) + '18' }]}>
                  <Ionicons name={signal.icon} size={20} color={signal.color ?? colors.primary} />
                </View>
                <Text style={styles.trustLabel}>{signal.label}</Text>
                <Text style={styles.trustSub}>{signal.sub}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Active case card (if user has attorney) ── */}
        {activeCase ? (
          <>
            <View style={styles.caseCard}>
              <Text style={styles.caseLabel}>Your Active Case</Text>
              <View style={{ gap: 3 }}>
                <Text style={styles.caseName}>
                  {activeCase.attorneys?.name ?? 'Your Attorney'}
                </Text>
                <Text style={styles.caseFirm}>
                  {activeCase.attorneys?.firm ?? 'Immigration Law'}
                </Text>
              </View>
              <View style={styles.caseStatusRow}>
                <View style={styles.caseStatusDot} />
                <Text style={styles.caseStatusTxt}>Case Active</Text>
              </View>
              <TouchableOpacity
                style={styles.msgBtn}
                onPress={() => { mediumHaptic(); navigation.navigate('AttorneyMatch'); }}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                <Text style={styles.msgBtnTxt}>Message Attorney</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => { lightHaptic(); navigation.navigate('Documents'); }}
                activeOpacity={0.8}
              >
                <Ionicons name="documents-outline" size={16} color="#7F8C8D" />
                <Text style={styles.secondaryBtnTxt}>View My Documents</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Contextual banner */}
            {contextTip && (
              <View style={styles.contextBanner}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.contextBannerTxt}>{contextTip}</Text>
              </View>
            )}

            {/* ── WHY CONNECT ── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Why Connect with an Attorney?</Text>
              {WHY_CONNECT.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletTxt}>{item}</Text>
                </View>
              ))}
            </View>

            {/* ── HOW IT WORKS ── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>How It Works</Text>
              <View style={styles.howRow}>
                {HOW_IT_WORKS.map((step, i) => (
                  <React.Fragment key={step.num}>
                    {i > 0 && <View style={styles.howConnector} />}
                    <View style={styles.howStep}>
                      <View style={styles.howNum}>
                        <Text style={styles.howNumTxt}>{step.num}</Text>
                      </View>
                      <Text style={styles.howLabel}>{step.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* ── PRIMARY CTA ── */}
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => { mediumHaptic(); navigation.navigate('AttorneyMatch'); }}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.ctaTxt}>Find an Attorney</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            {/* ── Free consultation note ── */}
            <View style={{ alignItems: 'center', marginTop: 16, marginHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle" size={14} color="#27AE60" />
                <Text style={{ fontSize: 13, color: '#27AE60', fontWeight: '700' }}>
                  Free initial consultation available with select attorneys
                </Text>
              </View>
            </View>

            {/* ── Disclaimer ── */}
            <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#F5A623' }}>
              <Text style={{ fontSize: 12, color: '#7c4a00', lineHeight: 18 }}>
                ⚠️ PathwayUSA connects you with independent attorneys. We are not a law firm and do not provide legal advice. Attorney fees and availability vary.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
