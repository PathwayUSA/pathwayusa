import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Linking } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const TRAVEL_STATS_KEY = '@pathwayusa/travel_stats_v1';
const R = 40;
const CIRC = 2 * Math.PI * R;

function fmtDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMonth(isoStr) {
  return new Date(isoStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function makeStyles(colors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 20,
      marginTop: 20,
      backgroundColor: '#fff',
      borderRadius: 20,
      overflow: 'hidden',
      ...SHADOWS.small,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    cardHeaderLabel: {
      fontSize: 11,
      fontWeight: '900',
      color: 'rgba(255,255,255,0.9)',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
    },
    body: {
      padding: 18,
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
    },
    ringWrap: {
      width: 96,
      height: 96,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
    },
    ringPct: {
      fontSize: 16,
      fontWeight: '900',
      textAlign: 'center',
    },
    right: {
      flex: 1,
      gap: 5,
    },
    countdown: {
      fontSize: 20,
      fontWeight: '900',
      color: '#1A1A2E',
      lineHeight: 25,
    },
    eligibleNow: {
      fontSize: 17,
      fontWeight: '900',
      color: '#27AE60',
      lineHeight: 22,
    },
    eligibleDate: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    meta: {
      fontSize: 12,
      color: '#7F8C8D',
      lineHeight: 17,
    },
    footer: {
      paddingHorizontal: 18,
      paddingBottom: 14,
    },
    disclaimer: {
      fontSize: 11,
      color: '#BDC3C7',
      lineHeight: 15,
    },
    n400Btn: {
      marginHorizontal: 18,
      marginBottom: 16,
      backgroundColor: '#27AE60',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    n400BtnTxt: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      gap: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: '#1A1A2E',
      textAlign: 'center',
    },
    modalSub: {
      fontSize: 14,
      color: '#7F8C8D',
      textAlign: 'center',
      lineHeight: 20,
    },
    modalBtns: {
      gap: 10,
      marginTop: 4,
    },
    modalBtn: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    modalBtnTxt: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
    },
    modalBtnSecondary: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    modalBtnSecondaryTxt: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primary,
    },
    promptBody: {
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    promptIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    promptTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1A1A2E',
    },
    promptSub: {
      fontSize: 12,
      color: '#7F8C8D',
      marginTop: 3,
      lineHeight: 17,
    },

    // ── Hero variant — for the navy header hero position on Home ──────────────
    heroWrap: { gap: 4 },
    heroEyebrow: { color: '#9FB0BA', fontSize: 12.5, marginBottom: 2 },
    heroCountdown: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 34 },
    heroDate: { color: colors.primaryLight ?? '#B7E4D8', fontSize: 13, marginTop: 2 },
    heroBarBg: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: 14 },
    heroBarFill: { height: 5, borderRadius: 3, backgroundColor: '#fff' },
    heroPromptRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroPromptTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, lineHeight: TYPOGRAPHY.headingLineHeight, color: '#fff', flexShrink: 1 },
    heroDisclaimerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    heroDisclaimer: { color: 'rgba(255,255,255,0.42)', fontSize: 10.5, lineHeight: 15, flexShrink: 1 },
    heroDisclaimerLink: { color: 'rgba(255,255,255,0.55)', fontSize: 10.5, textDecorationLine: 'underline' },
    riskBody: { padding: 18, alignItems: 'center', gap: 10 },
    riskTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
    riskSub: { fontSize: 13, color: '#7F8C8D', textAlign: 'center', lineHeight: 19 },
    riskLink: { fontSize: 13, fontWeight: '700', color: colors.primary },
  });
}

export default function CitizenshipCountdownCard({ profile, navigation, variant = 'card' }) {
  const { colors } = useTheme();
  const { updateProfile } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [travelData, setTravelData] = useState({ daysAbroad: 0, hasRisk: false, tripCount: 0 });
  const [showMarriedModal, setShowMarriedModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TRAVEL_STATS_KEY)
      .then((raw) => {
        const s = raw ? JSON.parse(raw) : {};
        setTravelData({
          daysAbroad: s.daysAbroad  ?? 0,
          hasRisk:    s.hasRisk     ?? false,
          tripCount:  s.tripCount   ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  const gcDate    = profile?.green_card_date ?? null;
  const pathYears = profile?.gc_path_years ?? 5;

  useEffect(() => {
    if (gcDate && profile?.married_to_citizen == null) {
      setShowMarriedModal(true);
    }
  }, [gcDate, profile?.married_to_citizen]);

  const handleMarriedAnswer = (isMarried) => {
    setShowMarriedModal(false);
    updateProfile({
      married_to_citizen: isMarried,
      gc_path_years: isMarried ? 3 : 5,
    }).catch(() => {});
  };

  const calc = useMemo(() => {
    if (!gcDate) return null;
    const gcStart   = new Date(gcDate + 'T00:00:00');
    const eligible  = new Date(gcStart);
    eligible.setFullYear(eligible.getFullYear() + pathYears);

    // Shift by abroad days that exceed the physical-presence allowance.
    // 5-yr path: must be physically present 913+ days (30 months);
    // 3-yr path: 548+ days (18 months) — matches TravelTrackerScreen's calcStats.
    const requiredPresence = pathYears === 3 ? 548 : 913;
    // Use real calendar days in the eligibility period — not pathYears × 365 —
    // so leap years are counted correctly.
    const actualPeriodDays = Math.round((eligible.getTime() - gcStart.getTime()) / 86400000);
    const allowedAbroad    = actualPeriodDays - requiredPresence;
    const excess           = Math.max(0, travelData.daysAbroad - allowedAbroad);
    if (excess > 0) eligible.setDate(eligible.getDate() + Math.round(excess));

    // INA 334(a): Form N-400 may be filed up to 90 days before the
    // continuous-residence anniversary above. That earlier date is the
    // actionable "you can apply" moment the hero countdown tracks;
    // `eligible` (the full anniversary) is kept separately for the detail line.
    const filingEligible = new Date(eligible);
    filingEligible.setDate(filingEligible.getDate() - 90);

    const today    = new Date();
    const totalMs  = filingEligible.getTime() - gcStart.getTime();
    const elapsed  = Math.max(0, today.getTime() - gcStart.getTime());
    const pct      = Math.min(100, (elapsed / totalMs) * 100);
    const remaining = filingEligible.getTime() - today.getTime();
    const isPast   = remaining <= 0;
    const absDays  = Math.ceil(Math.abs(remaining) / 86400000);
    const y        = Math.floor(absDays / 365);
    const mo       = Math.floor((absDays % 365) / 30);
    const d        = absDays % 30;
    return { eligibleDate: eligible, filingEligibleDate: filingEligible, pct, isPast, y, mo, d, excess };
  }, [gcDate, pathYears, travelData.daysAbroad]);

  // No green card date — prompt to set it (hero variant: navy-header prompt)
  if (!gcDate && variant === 'hero') {
    return (
      <TouchableOpacity
        onPress={() => navigation?.navigate('TravelTracker')}
        activeOpacity={0.85}
      >
        <View style={styles.heroPromptRow}>
          <Text style={styles.heroPromptTitle}>Add your Green Card date →</Text>
        </View>
        <Text style={[styles.heroDate, { marginTop: 4 }]}>
          See exactly when you can apply for U.S. citizenship
        </Text>
      </TouchableOpacity>
    );
  }

  // No green card date — prompt to set it
  if (!gcDate) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation?.navigate('TravelTracker')}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="ribbon" size={15} color="rgba(255,255,255,0.9)" />
          <Text style={styles.cardHeaderLabel}>Citizenship Eligibility</Text>
        </View>
        <View style={styles.promptBody}>
          <View style={styles.promptIcon}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.promptTitle}>Add your Green Card date →</Text>
            <Text style={styles.promptSub}>
              See exactly when you can apply for U.S. citizenship
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
        </View>
      </TouchableOpacity>
    );
  }

  // A trip > 6 months presumptively breaks continuous residence — unsafe to show a date
  if (travelData.hasRisk && variant === 'hero') {
    return (
      <TouchableOpacity onPress={() => navigation?.navigate('TravelTracker')} activeOpacity={0.85}>
        <Text style={styles.heroEyebrow}>Citizenship eligibility</Text>
        <Text style={styles.heroPromptTitle}>Review your trip history →</Text>
        <Text style={[styles.heroDate, { marginTop: 4 }]}>
          A trip over 6 months can reset your residence clock. Tap to review before we estimate your date.
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'hero') {
    return (
      <View style={styles.heroWrap}>
        <Text style={styles.heroEyebrow}>
          {calc.isPast ? 'You may be able to apply for citizenship' : 'You can apply for citizenship in'}
        </Text>
        {calc.isPast ? (
          <Text style={styles.heroCountdown}>Now 🎉</Text>
        ) : (
          <Text style={styles.heroCountdown}>
            {calc.y > 0
              ? `${calc.y} year${calc.y > 1 ? 's' : ''}${calc.mo > 0 ? `, ${calc.mo} month${calc.mo > 1 ? 's' : ''}` : ''}`
              : calc.mo > 0
              ? `${calc.mo} month${calc.mo > 1 ? 's' : ''}`
              : `${calc.d} day${calc.d !== 1 ? 's' : ''}`}
          </Text>
        )}
        <Text style={styles.heroDate}>Earliest filing date · {fmtDate(calc.filingEligibleDate)}</Text>
        <View style={styles.heroBarBg}>
          <View style={[styles.heroBarFill, { width: `${Math.round(calc.pct)}%` }]} />
        </View>

        {/* Estimate attribution + uscis.gov link */}
        <View style={styles.heroDisclaimerRow}>
          <Text style={styles.heroDisclaimer}>
            {'Estimate · '}
            {travelData.tripCount === 0 ? 'no trips logged' : `${travelData.daysAbroad}d abroad logged`}
            {' · '}{pathYears}yr path
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.uscis.gov/citizenship')} activeOpacity={0.8}>
            <Text style={styles.heroDisclaimerLink}>uscis.gov →</Text>
          </TouchableOpacity>
        </View>
        {pathYears === 3 && (
          <Text style={styles.heroDisclaimer}>
            3-yr path also requires living with your spouse and their U.S. citizenship for all 3 years
          </Text>
        )}

        <Modal
          visible={showMarriedModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMarriedModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Ionicons name="heart-outline" size={36} color={colors.primary} style={{ alignSelf: 'center' }} />
              <Text style={styles.modalTitle}>Are you married to{'\n'}a U.S. citizen?</Text>
              <Text style={styles.modalSub}>
                The 3-year path requires: married to and living with a U.S. citizen, AND your spouse must have been a U.S. citizen for the full 3 years. Otherwise the 5-year path applies.
              </Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleMarriedAnswer(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBtnTxt}>Yes — 3-Year Path</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalBtnSecondary}
                  onPress={() => handleMarriedAnswer(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBtnSecondaryTxt}>No — 5-Year Path</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // A trip > 6 months presumptively breaks continuous residence — unsafe to show a date
  if (travelData.hasRisk) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="ribbon" size={15} color="rgba(255,255,255,0.9)" />
          <Text style={styles.cardHeaderLabel}>
            Citizenship Eligibility · {pathYears}-Year Path
          </Text>
        </View>
        <View style={styles.riskBody}>
          <Ionicons name="warning-outline" size={24} color="#E67E22" />
          <Text style={styles.riskTitle}>Trip review needed</Text>
          <Text style={styles.riskSub}>
            One of your logged trips is longer than 6 months and may have reset your continuous residence clock. We can't safely estimate your filing date without reviewing it.
          </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('TravelTracker')} activeOpacity={0.85}>
            <Text style={styles.riskLink}>Review in Travel Tracker →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footer}>
          <Text style={styles.disclaimer}>
            Estimate only · A single trip of 181+ days presumptively breaks continuous residence · Consult an attorney to confirm your eligibility
          </Text>
        </View>
      </View>
    );
  }

  const strokeOffset = CIRC - ((calc?.pct ?? 0) / 100) * CIRC;
  const ringColor    = calc?.isPast ? '#27AE60' : colors.primary;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="ribbon" size={15} color="rgba(255,255,255,0.9)" />
        <Text style={styles.cardHeaderLabel}>
          Citizenship Eligibility · {pathYears}-Year Path
        </Text>
      </View>

      <View style={styles.body}>
        {/* Progress ring */}
        <View style={styles.ringWrap}>
          <Svg width={96} height={96} viewBox="0 0 96 96">
            <Circle
              cx="48" cy="48" r={R}
              fill="none"
              stroke="#E8ECE8"
              strokeWidth="8"
            />
            <Circle
              cx="48" cy="48" r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeDasharray={`${CIRC} ${CIRC}`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              rotation="-90"
              origin="48,48"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringPct, { color: ringColor }]}>
              {Math.round(calc?.pct ?? 0)}%
            </Text>
          </View>
        </View>

        {/* Countdown text */}
        <View style={styles.right}>
          {calc?.isPast ? (
            <Text style={styles.eligibleNow}>You may be able to apply now! 🎉</Text>
          ) : (
            <>
              <Text style={styles.countdown}>
                {calc.y > 0 ? `${calc.y}y ` : ''}
                {calc.mo > 0 ? `${calc.mo}mo ` : ''}
                {calc.d}d remaining
              </Text>
              <Text style={styles.eligibleDate}>
                Earliest filing date {fmtDate(calc.filingEligibleDate)}
              </Text>
            </>
          )}
          <Text style={styles.meta}>
            Green card: {fmtMonth(gcDate)}
          </Text>
          <Text style={styles.meta}>
            Full {pathYears}-year mark: {fmtDate(calc.eligibleDate)}
          </Text>
          {calc?.excess > 0 && (
            <Text style={styles.meta}>
              +{Math.round(calc.excess)}d travel adjustment
            </Text>
          )}
        </View>
      </View>

      {calc?.isPast && (
        <TouchableOpacity
          style={styles.n400Btn}
          onPress={() => Linking.openURL('https://www.uscis.gov/n-400')}
          activeOpacity={0.85}
        >
          <Ionicons name="open-outline" size={18} color="#fff" />
          <Text style={styles.n400BtnTxt}>Start N-400 Application →</Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <Text style={styles.disclaimer}>
          {'Estimate only · Reflects the 90-day early filing window (INA 334(a)) · '}
          {travelData.tripCount === 0 ? 'No trips logged — log travel for accuracy' : `${travelData.daysAbroad}d abroad logged`}
          {pathYears === 3 ? ' · 3-yr path also requires living with your spouse and their U.S. citizenship for all 3 years' : ''}
          {' · Consult an attorney to confirm eligibility · '}
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.uscis.gov/citizenship')} activeOpacity={0.8}>
          <Text style={[styles.disclaimer, { color: colors.primary, textDecorationLine: 'underline' }]}>
            Verify at uscis.gov →
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMarriedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMarriedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Ionicons name="heart-outline" size={36} color={colors.primary} style={{ alignSelf: 'center' }} />
            <Text style={styles.modalTitle}>Are you married to{'\n'}a U.S. citizen?</Text>
            <Text style={styles.modalSub}>
              The 3-year path requires: married to and living with a U.S. citizen, AND your spouse must have been a U.S. citizen for the full 3 years. Otherwise the 5-year path applies.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleMarriedAnswer(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnTxt}>Yes — 3-Year Path</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => handleMarriedAnswer(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnSecondaryTxt}>No — 5-Year Path</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
