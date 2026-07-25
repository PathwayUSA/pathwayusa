import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';
import { getPathway } from '../lib/pathwayRouter';
import { ONBOARDING_KEY, ONBOARDING_DATA_KEY } from './onboarding/IntakeStack';
import { useOnboardingRefresh } from '../context/OnboardingContext';
import { useLanguage } from '../i18n';
import CitizenshipCountdownCard from '../components/CitizenshipCountdownCard';

const { width } = Dimensions.get('window');
const TEAL = '#2A8B7A';
const GOLD = '#F5A623';

const TABS = ['Steps', 'Timeline', 'Tasks'];

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

    // Tab pills
    tabPills: { flexDirection: 'row', marginHorizontal: 20, marginTop: 18, backgroundColor: '#fff', borderRadius: 14, padding: 4, ...SHADOWS.small },
    tabPill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabPillActive: { backgroundColor: colors.primary },
    tabPillTxt: { fontSize: 14, fontWeight: '700', color: '#7F8C8D' },
    tabPillTxtActive: { color: '#fff' },

    // Progress card
    progressCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14, ...SHADOWS.medium },
    progressTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    progressLabel: { fontSize: 11, fontWeight: '700', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 1 },
    progressPct: { fontSize: 36, fontWeight: '900', color: colors.primary, lineHeight: 44 },
    progressBarBg: { height: 10, backgroundColor: '#E8ECE8', borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: 10, backgroundColor: colors.primary, borderRadius: 5 },
    progressMeta: { fontSize: 13, color: '#7F8C8D' },

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

    // Next Up section
    nextUpSection: { paddingHorizontal: 20, marginTop: 22 },
    nextUpTitle: { fontSize: 16, fontWeight: '900', color: '#1A1A2E', marginBottom: 12 },
    nextStepRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, gap: 14, ...SHADOWS.small },
    nextStepIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F7F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    nextStepTextWrap: { flex: 1, gap: 2 },
    nextStepTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
    nextStepStatus: { fontSize: 12, color: '#7F8C8D' },

    // Steps tab — full list
    stepsList: { paddingHorizontal: 20, marginTop: 16, gap: 10 },
    stepListRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 14, ...SHADOWS.small },
    stepNumCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    stepNumTxt: { fontSize: 13, fontWeight: '900' },
    stepListContent: { flex: 1, gap: 3 },
    stepListTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
    stepListDesc: { fontSize: 12, color: '#7F8C8D', lineHeight: 18 },
    stepListMeta: { fontSize: 11, color: '#BDC3C7' },
    stepListBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
    stepListBadgeTxt: { fontSize: 10, fontWeight: '800' },

    // Timeline tab
    timelineWrap: { paddingHorizontal: 20, marginTop: 16 },
    timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 4 },
    timelineLeft: { alignItems: 'center', width: 36, flexShrink: 0 },
    timelineDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    timelineLine: { width: 2, flex: 1, minHeight: 24, marginVertical: 4 },
    timelineContent: { flex: 1, paddingBottom: 18 },
    timelineTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', marginBottom: 3 },
    timelineForm: { fontSize: 12, color: colors.primary, fontWeight: '700', marginBottom: 4 },
    timelineTime: { fontSize: 11, color: '#BDC3C7' },

    // Tasks tab
    tasksWrap: { paddingHorizontal: 20, marginTop: 16, gap: 10 },
    taskCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, ...SHADOWS.small },
    taskCardTitle: { fontSize: 15, fontWeight: '900', color: '#1A1A2E' },
    taskItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    taskCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
    taskTxt: { fontSize: 14, color: '#333', lineHeight: 21, flex: 1 },
    taskTxtDone: { textDecorationLine: 'line-through', color: '#BDC3C7' },

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
  const [taskChecks, setTaskChecks] = useState({});
  const [loading, setLoading] = useState(true);
  const progressAnim = useRef(new Animated.Value(0)).current;

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

  // Next 2 steps after current
  const nextSteps = currentStepIndex >= 0
    ? steps.slice(currentStepIndex + 1, currentStepIndex + 3)
    : [];

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: journeyPct / 100,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [journeyPct]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ── Mark step complete ────────────────────────────────────────────────────

  const markStepComplete = useCallback(async (stepId) => {
    if (!user || !stepId) return;
    successHaptic();
    setCompletedStepIds((prev) => new Set([...prev, String(stepId)]));
    await supabase
      .from('user_progress')
      .upsert({ user_id: user.id, step_id: String(stepId), completed: true }, { onConflict: 'user_id,step_id' })
      .catch(() => {});
  }, [user]);

  // ── Tasks for current step ────────────────────────────────────────────────

  const currentStepTasks = currentStep?.keyPoints ?? currentStep?.description
    ? [currentStep.description]
    : [];

  const toggleTask = useCallback((key) => {
    lightHaptic();
    setTaskChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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
      <Text style={styles.noPathwayTxt}>Your Personalized Roadmap Awaits</Text>
      <Text style={styles.noPathwaySub}>
        Complete the 2-minute assessment to get a step-by-step roadmap built for your exact situation.
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
        <Text style={styles.startBtnTxt}>Build My Roadmap</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // ── STEPS tab content ─────────────────────────────────────────────────────

  const StepsView = !pathway ? NoPathwayView : (
    <>
      {/* Overall progress card */}
      <View style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A2E' }}>
              {pathway.title}
            </Text>
          </View>
          <Text style={styles.progressPct}>{journeyPct}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: progressBarWidth }]} />
        </View>
        <Text style={styles.progressMeta}>
          {journeyPct === 100
            ? `All ${totalSteps} steps completed 🎉`
            : `${completedCount} of ${totalSteps} steps completed`}
        </Text>
      </View>

      {/* Citizenship eligibility countdown — Green Card holders only */}
      {pathway?.id === 'gc_citizenship' && (
        <CitizenshipCountdownCard profile={profile} navigation={navigation} />
      )}

      {/* Current step card */}
      {currentStep && journeyPct < 100 && (
        <View style={styles.currentStepCard}>
          <View style={styles.currentStepTopRow}>
            <View style={styles.currentStepIconWrap}>
              <Ionicons name={stepIcon(currentStepIndex)} size={22} color={colors.primary} />
            </View>
            <Text style={styles.currentStepBadge}>
              Step {currentStepIndex + 1} of {totalSteps}
            </Text>
          </View>
          <Text style={styles.currentStepTitle}>{currentStep.title}</Text>
          {currentStep.description ? (
            <Text style={styles.currentStepDesc} numberOfLines={3}>
              {currentStep.description}
            </Text>
          ) : null}
          {currentStep.timeframe ? (
            <Text style={styles.currentStepTime}>Est. time: {currentStep.timeframe}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => {
              mediumHaptic();
              navigation.navigate('StepMission', {
                step: currentStep,
                stepIndex: currentStepIndex,
                totalSteps,
                pathway,
                steps,
              });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnTxt}>Continue Step →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Completed state */}
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

      {/* Next Up */}
      {nextSteps.length > 0 && (
        <View style={styles.nextUpSection}>
          <Text style={styles.nextUpTitle}>Next Up</Text>
          {nextSteps.map((step, i) => (
            <TouchableOpacity
              key={step.id}
              style={styles.nextStepRow}
              onPress={() => lightHaptic()}
              activeOpacity={0.82}
            >
              <View style={styles.nextStepIconWrap}>
                <Ionicons name={stepIcon(currentStepIndex + 1 + i)} size={20} color="#BDC3C7" />
              </View>
              <View style={styles.nextStepTextWrap}>
                <Text style={styles.nextStepTitle}>{step.title}</Text>
                <Text style={styles.nextStepStatus}>
                  {i === 0 ? 'Upcoming' : 'Not started'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#E8ECE8" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  // ── TIMELINE tab content ──────────────────────────────────────────────────

  const TimelineView = !pathway ? NoPathwayView : (
    <View style={styles.timelineWrap}>
      {steps.map((step, i) => {
        const isDone    = completedStepIds.has(String(step.id)) || i < completedCount;
        const isCurrent = i === currentStepIndex;
        const isLast    = i === steps.length - 1;
        const dotColor  = isDone ? colors.primary : isCurrent ? TEAL : '#E8ECE8';
        const lineColor = isDone ? colors.primary + '40' : '#E8ECE8';
        return (
          <View key={step.id} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: dotColor }]}>
                {isDone
                  ? <Ionicons name="checkmark" size={16} color="#fff" />
                  : <Text style={[styles.stepNumTxt, { color: isCurrent ? '#fff' : '#BDC3C7' }]}>{i + 1}</Text>
                }
              </View>
              {!isLast && <View style={[styles.timelineLine, { backgroundColor: lineColor }]} />}
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, isDone && { color: '#7F8C8D' }]}>
                {step.title}
              </Text>
              {step.form && <Text style={styles.timelineForm}>{step.form}</Text>}
              <Text style={styles.timelineTime}>{step.timeframe ?? ''}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  // ── TASKS tab content ─────────────────────────────────────────────────────

  const genericTasks = [
    'Gather all required identity documents',
    'Make copies of all documents (front and back)',
    'Get certified English translations if needed',
    'Check USCIS processing times at uscis.gov',
    'Set deadline reminders on your phone',
  ];

  const currentTasks = currentStep?.keyPoints ?? genericTasks;

  const TasksView = !pathway ? NoPathwayView : (
    <View style={styles.tasksWrap}>
      <View style={styles.taskCard}>
        <Text style={styles.taskCardTitle}>
          {currentStep ? `Step ${currentStepIndex + 1}: ${currentStep.title}` : 'General Tasks'}
        </Text>
        {currentTasks.map((task, i) => {
          const key = `task_${i}`;
          const done = taskChecks[key] ?? false;
          return (
            <TouchableOpacity
              key={key}
              style={styles.taskItem}
              onPress={() => toggleTask(key)}
              activeOpacity={0.8}
            >
              <View style={[styles.taskCheck, {
                borderColor: done ? colors.primary : '#E8ECE8',
                backgroundColor: done ? colors.primary : '#fff',
              }]}>
                {done && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={[styles.taskTxt, done && styles.taskTxtDone]}>{task}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Document checklist card */}
      {currentStep?.form && (
        <View style={styles.taskCard}>
          <Text style={styles.taskCardTitle}>Required Form</Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary + '12', borderRadius: 12, padding: 14 }}
            onPress={() => { lightHaptic(); navigation.navigate('FormExplainer'); }}
            activeOpacity={0.8}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A2E' }}>{currentStep.form}</Text>
              <Text style={{ fontSize: 12, color: '#7F8C8D' }}>Tap for a plain-language field guide</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>
        </View>
      )}

      {/* Resource links */}
      <View style={styles.taskCard}>
        <Text style={styles.taskCardTitle}>If Something Goes Wrong</Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14 }}
          onPress={() => { lightHaptic(); navigation.navigate('RFE'); }}
          activeOpacity={0.8}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFE0B2', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="warning-outline" size={20} color="#E65100" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A2E' }}>Received a Request for Evidence?</Text>
            <Text style={{ fontSize: 12, color: '#7F8C8D' }}>Step-by-step response guide</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* Attorney CTA */}
      <TouchableOpacity
        style={{ backgroundColor: GOLD, borderRadius: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...SHADOWS.small }}
        onPress={() => { lightHaptic(); navigation.navigate('Legal'); }}
        activeOpacity={0.85}
      >
        <Ionicons name="briefcase-outline" size={18} color="#fff" />
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Get Attorney Help for This Step</Text>
      </TouchableOpacity>
    </View>
  );

  const tabContent = [StepsView, TimelineView, TasksView];

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

        {/* ── TAB PILLS ── */}
        <View style={styles.tabPills}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabPill, activeTab === i && styles.tabPillActive]}
              onPress={() => { lightHaptic(); setActiveTab(i); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabPillTxt, activeTab === i && styles.tabPillTxtActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB CONTENT ── */}
        {tabContent[activeTab]}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
