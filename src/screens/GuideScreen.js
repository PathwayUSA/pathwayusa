import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { lightHaptic, mediumHaptic } from '../utils/haptics';
import { getPathway } from '../lib/pathwayRouter';
import { ONBOARDING_KEY, ONBOARDING_DATA_KEY } from './onboarding/IntakeStack';
import { useOnboardingRefresh } from '../context/OnboardingContext';
import { useLanguage } from '../i18n';

// ─── Generic step icons ───────────────────────────────────────────────────────

function stepIcon(index) {
  const icons = [
    'help-circle-outline', 'document-text-outline', 'time-outline',
    'clipboard-outline', 'finger-print-outline', 'medical-outline',
    'person-outline', 'ribbon-outline', 'checkmark-circle-outline',
    'star-outline', 'home-outline', 'card-outline',
  ];
  return icons[index % icons.length];
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7F5' },

    // Header
    header: { paddingHorizontal: 24, paddingBottom: 28 },
    headerTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 32 },
    headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 20 },

    // Single continuous list
    stepLine: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 8, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, opacity: 0.62 },
    stepLineLocked: { opacity: 1, backgroundColor: '#F5F7F5' },
    stepLineTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', flex: 1 },
    stepLineTitleLocked: { color: '#7F8C8D' },
    stepLineMeta: { fontSize: 12, color: '#BDC3C7' },

    // Current step card
    currentStepCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#fff', borderRadius: 20, borderLeftWidth: 5, borderLeftColor: colors.primary, padding: 20, gap: 12, ...SHADOWS.small },
    currentStepTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    currentStepBadge: { fontSize: 12, color: '#7F8C8D', fontWeight: '600' },
    currentStepIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
    currentStepTitle: { fontSize: 17, fontWeight: '900', color: '#1A1A2E', lineHeight: 24 },
    currentStepDesc: { fontSize: 14, color: '#7F8C8D', lineHeight: 21 },
    currentStepTime: { fontSize: 12, color: '#BDC3C7', fontWeight: '600' },
    continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, borderRadius: 14, height: 52 },
    continueBtnTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },

    // No pathway card
    noPathwayCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', gap: 14, ...SHADOWS.small },
    noPathwayTxt: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
    noPathwaySub: { fontSize: 14, color: '#7F8C8D', textAlign: 'center', lineHeight: 21 },
    startBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, height: 52, paddingHorizontal: 28 },
    startBtnTxt: { fontSize: 15, fontWeight: '900', color: '#fff' },
  });
}

export default function GuideScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { refresh: refreshOnboarding } = useOnboardingRefresh();

  const [activeTab, setActiveTab] = useState(0);
  const [intakeData, setIntakeData] = useState(null);
  const [completedStepIds, setCompletedStepIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // ── Load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DATA_KEY)
      .then((raw) => { if (raw) setIntakeData(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const fetchProgress = useCallback((isInitial = false) => {
    if (!user) { if (isInitial) setLoading(false); return; }
    supabase
      .from('user_progress')
      .select('step_id, completed')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const done = new Set((data ?? []).filter((r) => r.completed).map((r) => r.step_id));
        setCompletedStepIds(done);
        if (isInitial) setLoading(false);
      })
      .catch(() => { if (isInitial) setLoading(false); });
  }, [user]);

  // Initial load (shows spinner)
  useEffect(() => { fetchProgress(true); }, [fetchProgress]);

  // Refresh silently whenever the screen regains focus (e.g., returning from StepMission)
  useFocusEffect(useCallback(() => { fetchProgress(false); }, [fetchProgress]));

  // ── Derived pathway ───────────────────────────────────────────────────────

  const intakeStatus = intakeData?.immigration_status ?? profile?.immigration_status ?? null;
  const intakeGoals  = intakeData?.immigration_goals ?? intakeData?.goals ?? [];
  const pathway      = intakeStatus ? getPathway(intakeStatus, intakeGoals) : null;
  const steps        = pathway?.steps ?? [];
  const totalSteps   = steps.length;

  // Derive completed count — fallback: treat step N as completed if index < completedStepIds.size
  const completedCount = steps.filter((s, i) => completedStepIds.has(String(s.id)) || completedStepIds.has(`step_${i + 1}`)).length;
  const journeyPct = totalSteps > 0 ? Math.min(Math.round((completedCount / totalSteps) * 100), 100) : 0;

  // Current step = first incomplete step
  const currentStepIndex = steps.findIndex((s, i) => !completedStepIds.has(String(s.id)) && !completedStepIds.has(`step_${i + 1}`));
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : steps[steps.length - 1] ?? null;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7F5' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ── No pathway yet ────────────────────────────────────────────────────────

  const NoPathwayView = (
    <View style={styles.noPathwayCard}>
      <Text style={{ fontSize: 36 }}>🗺️</Text>
      <Text style={styles.noPathwayTxt}>Your Personalized Path Awaits</Text>
      <Text style={styles.noPathwaySub}>
        Complete the 2-minute assessment to get a step-by-step path built for your exact situation.
      </Text>
      <TouchableOpacity
        style={styles.startBtn}
        onPress={async () => {
          mediumHaptic();
          if (user) await AsyncStorage.removeItem(`${ONBOARDING_KEY}/${user.id}`).catch(() => {});
          refreshOnboarding();
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.startBtnTxt}>Build My Path</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // ── Single continuous list: done steps dimmed, active step expanded, future steps locked ──

  const PathView = !pathway ? NoPathwayView : (
    <>
      {steps.map((step, i) => {
        const isDone    = completedStepIds.has(String(step.id)) || i < completedCount;
        const isCurrent = i === currentStepIndex && journeyPct < 100;
        const isLocked  = !isDone && !isCurrent;

        if (isCurrent) {
          return (
            <View key={step.id} style={styles.currentStepCard}>
              <View style={styles.currentStepTopRow}>
                <View style={styles.currentStepIconWrap}>
                  <Ionicons name={stepIcon(i)} size={22} color={colors.primary} />
                </View>
                <Text style={styles.currentStepBadge}>YOU ARE HERE · STEP {i + 1} OF {totalSteps}</Text>
              </View>
              <Text style={styles.currentStepTitle}>{step.title}</Text>
              {step.description ? (
                <Text style={styles.currentStepDesc} numberOfLines={3}>
                  {step.description}
                </Text>
              ) : null}
              {step.timeframe ? (
                <Text style={styles.currentStepTime}>{step.timeframe}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={() => {
                  mediumHaptic();
                  navigation.navigate('StepMission', {
                    step, stepIndex: i, totalSteps, pathway, steps,
                  });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.continueBtnTxt}>Continue Step →</Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <View
            key={step.id}
            style={[styles.stepLine, isLocked && styles.stepLineLocked]}
          >
            <Ionicons
              name={isDone ? 'checkmark-circle' : 'lock-closed-outline'}
              size={20}
              color={isDone ? colors.primary : '#B4B2A9'}
            />
            <Text style={[styles.stepLineTitle, isLocked && styles.stepLineTitleLocked]} numberOfLines={1}>
              {step.title}
            </Text>
            <Text style={styles.stepLineMeta}>{isDone ? 'Done' : 'Locked'}</Text>
          </View>
        );
      })}

      {journeyPct === 100 && (
        <View style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: '#EAF7EE', borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 40 }}>🎉</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#27AE60', textAlign: 'center' }}>
            Journey Complete!
          </Text>
          <Text style={{ fontSize: 14, color: '#388e3c', textAlign: 'center', lineHeight: 21 }}>
            You've completed all steps in your pathway. Congratulations!
          </Text>
        </View>
      )}
    </>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <LinearGradient
          colors={colors.gradient}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
          start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}
        >
          <View style={styles.headerTopBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t('guide_header_title')}</Text>
              <Text style={styles.headerSub}>{t('guide_header_sub')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => { lightHaptic(); navigation.navigate('Notifications'); }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── SINGLE CONTINUOUS LIST ── */}
        {PathView}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
