import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Alert, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { lightHaptic, successHaptic } from '../utils/haptics';
import { QUESTIONS } from '../data/civicsQuestions';
import { supabase } from '../lib/supabase';
import { getPathway } from '../lib/pathwayRouter';
import { getMissionData, buildDefaultMissionData } from '../lib/stepMissionData';
import { ONBOARDING_KEY, ONBOARDING_DATA_KEY } from './onboarding/IntakeStack';
import { useOnboardingRefresh } from '../context/OnboardingContext';
import NewsHomeCard from '../components/NewsHomeCard';
import PathwayLogo from '../components/PathwayLogo';
import CitizenshipCountdownCard from '../components/CitizenshipCountdownCard';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import {
  scheduleDeadlineNotifications,
  registerForPushNotifications,
  scheduleAllUserNotifications,
  hasAskedNotificationPermission,
  markNotificationPermissionAsked,
} from '../lib/notifications';
import { useLanguage } from '../i18n';
import { useSubscription } from '../context/SubscriptionContext';

const { width } = Dimensions.get('window');
const INTAKE_DATA_KEY    = ONBOARDING_DATA_KEY;
const CHALLENGE_KEY      = '@pathwayusa/daily_challenge';
const CURRENT_STEP_KEY   = '@pathwayusa/current_step_id_cache';

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Phase 7 will make this functional (playback, language, pace). Until then
// it stays hidden rather than shipping a visibly non-functional control.
const VOICE_BAR_ENABLED = false;

const COUNTRY_FLAGS = {
  mexico: '🇲🇽', brazil: '🇧🇷', india: '🇮🇳', china: '🇨🇳', philippines: '🇵🇭',
  vietnam: '🇻🇳', el_salvador: '🇸🇻', cuba: '🇨🇺', dominican_republic: '🇩🇴',
  guatemala: '🇬🇹', haiti: '🇭🇹', korea: '🇰🇷', jamaica: '🇯🇲', colombia: '🇨🇴',
  nigeria: '🇳🇬', ghana: '🇬🇭', ethiopia: '🇪🇹', nepal: '🇳🇵', ukraine: '🇺🇦',
  honduras: '🇭🇳', venezuela: '🇻🇪', peru: '🇵🇪', ecuador: '🇪🇨', argentina: '🇦🇷',
};

function getFlag(country) {
  if (!country) return null;
  return COUNTRY_FLAGS[country.toLowerCase().replace(/\s+/g, '_')] ?? null;
}

function getGreeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t('good_morning');
  if (h < 18) return t('good_afternoon');
  return t('good_evening');
}

function getDailyQuestion() {
  if (!QUESTIONS?.length) return null;
  const dayIndex = Math.floor(Date.now() / 86400000);
  return QUESTIONS[dayIndex % QUESTIONS.length];
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: { paddingHorizontal: 24, paddingBottom: 44 },
    headerTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
    settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    greeting: { fontSize: 15, color: 'rgba(255,255,255,0.72)', marginBottom: 10 },
    heroTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#fff', lineHeight: TYPOGRAPHY.displayLineHeight, marginBottom: 8 },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 21 },

    progressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, borderRadius: 16, height: 56 },
    progressBtnTxt: { fontSize: 17, fontWeight: '900', color: '#fff' },

    // Voice control bar — placeholder for Phase 7
    voiceBar: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#16324F', marginHorizontal: 20, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, opacity: 0.6 },
    voicePlayBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    voiceBarTitle: { fontSize: 13.5, fontWeight: '600', color: '#fff' },
    voiceBarSub: { fontSize: 11.5, color: '#9FB0BA', marginTop: 1 },

    // List rows — documents, find help, full roadmap
    listSection: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', ...SHADOWS.small },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    listRowIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    listRowLabel: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: 17, color: '#1A1A2E' },
    listRowMeta: { fontSize: 13.5, color: '#7F8C8D', marginTop: 2 },

    // Daily challenge card
    challengeCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 14, ...SHADOWS.small },
    challengeHdr: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    challengeHdrText: { flex: 1, gap: 1 },
    challengeLabel: { fontSize: 11, fontWeight: '900', color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.8 }, // amber-700: readable on white (gold was 2:1)
    challengeStreakTxt: { fontSize: 20, fontWeight: '900', color: '#1A1A2E' },
    donePill: { backgroundColor: '#EAF7EE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    donePillTxt: { fontSize: 12, fontWeight: '700', color: '#27AE60' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
    weekDot: { alignItems: 'center', gap: 5 },
    weekCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    weekDayLabel: { fontSize: 11, fontWeight: '700', color: '#7F8C8D' },
    challengeQ: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', lineHeight: 24 },
    challengeOpts: { gap: 8 },
    challengeOpt: { borderWidth: 1.5, borderColor: '#E8ECE8', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
    challengeOptTxt: { fontSize: 15, color: '#333' },
    challengeOptCorrect: { borderColor: '#27AE60', backgroundColor: '#EAF7EE' },
    challengeOptWrong: { borderColor: '#E74C3C', backgroundColor: '#FEECEB' },
    challengeOptCorrectTxt: { color: '#27AE60', fontWeight: '700' },
    challengeOptWrongTxt: { color: '#E74C3C', fontWeight: '700' },
    challengeExplain: { backgroundColor: '#F5F7F5', borderRadius: 12, padding: 14, gap: 4 },
    challengeResultTxt: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
    challengeExplainTxt: { fontSize: 13, color: '#555', lineHeight: 20 },

    // Deadline / reminder card
    deadlineCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 10, borderLeftWidth: 4, ...SHADOWS.small },
    deadlineHdr: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deadlineTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', flex: 1 },
    deadlineSub: { fontSize: 13, color: '#7F8C8D', lineHeight: 20 },
    deadlineCta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    deadlineCtaTxt: { fontSize: 13, fontWeight: '700' },

    // Skip onboarding banner
    skipBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primaryLight, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.primary + '30' },
    skipBannerTxt: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, flex: 1 },

    // Today card (current step)
    currentStepCard: { marginHorizontal: 20, marginTop: -16, backgroundColor: '#fff', borderRadius: 24, borderWidth: 2.5, borderColor: colors.primary, padding: 20, gap: 14, ...SHADOWS.medium },
    currentStepHdr: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    currentStepIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    currentStepLabel: { fontSize: 11, fontWeight: '900', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 1 },
    currentStepTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: 21, color: '#1A1A2E', lineHeight: 26, marginTop: 2 },
    docProgressTxt: { fontSize: 15, color: '#5F6B6D', lineHeight: 22 },
    stepProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepProgressTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.primaryLight, overflow: 'hidden' },
    stepProgressFill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
    stepProgressTxt: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
  });
}

export default function HomeScreen({ navigation }) {
  const insets      = useSafeAreaInsets();
  const { colors }  = useTheme();
  const styles      = makeStyles(colors);
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { refresh: refreshOnboarding } = useOnboardingRefresh();
  const { isPro } = useSubscription();

  // Intake / onboarding
  const [intakeData, setIntakeData]       = useState(null);
  const [showSkipBanner, setShowSkipBanner] = useState(false);

  // Progress — Set of completed step_ids fetched from Supabase
  const [completedStepIds, setCompletedStepIds] = useState(new Set());

  // Streak
  const [streak, setStreak] = useState(0);

  // Deadlines
  const [nextDeadline, setNextDeadline]   = useState(null);
  const [allDeadlines, setAllDeadlines]   = useState([]);

  // Document progress for current step (displayed in UI)
  const [stepDocProgress, setStepDocProgress] = useState(null);
  // Total docs gathered across ALL steps (for weekly summary notification)
  const [totalDocsGathered, setTotalDocsGathered] = useState(0);

  // Notification permission modal (shown after first step completion)
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Ref keeps latest scheduling params fresh for AppState listener (avoids stale closures)
  const notifParamsRef = useRef({});

  // Daily challenge
  const [challengeQ]                         = useState(() => getDailyQuestion());
  const [challengeAnswer, setChallengeAnswer] = useState(null);
  const [challengeDone, setChallengeDone]     = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const firstName    = profile?.full_name?.split(' ')[0] ?? null;
  const countryFlag  = getFlag(profile?.country_of_birth ?? profile?.country ?? '');
  const intakeStatus = intakeData?.immigration_status ?? profile?.immigration_status ?? null;
  const intakeGoals  = intakeData?.immigration_goals ?? intakeData?.goals ?? [];
  const pathway      = intakeStatus ? getPathway(intakeStatus, intakeGoals) : null;
  const steps        = pathway?.steps ?? [];
  const totalSteps   = steps.length;
  // A step is complete if its id OR its 1-based index is in the completed set
  const completedCount = steps.filter((s, i) =>
    completedStepIds.has(String(s.id)) || completedStepIds.has(String(i + 1))
  ).length;
  const doneSteps    = completedCount;
  // First incomplete step = current step
  const currentStepIdx = steps.findIndex((s, i) =>
    !completedStepIds.has(String(s.id)) && !completedStepIds.has(String(i + 1))
  );
  const currentStep  = currentStepIdx >= 0 ? steps[currentStepIdx] : null;

  // Week dots
  const todayDow = new Date().getDay();
  // Only mark today — streak-based fill of previous days removed
  const activeDows = useMemo(() => {
    const s = new Set();
    if (challengeDone) s.add(todayDow);
    return s;
  }, [challengeDone, todayDow]);

  const isGcPath    = pathway?.id === 'gc_citizenship';
  const journeyDays = useMemo(() => {
    const startStr = profile?.onboarding_completed_at ?? profile?.created_at;
    if (!startStr) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(startStr).getTime()) / 86400000));
  }, [profile]);

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    AsyncStorage.getItem(INTAKE_DATA_KEY)
      .then((raw) => { if (raw) setIntakeData(JSON.parse(raw)); })
      .catch(() => {});
    AsyncStorage.getItem(user ? `${ONBOARDING_KEY}/${user.id}` : ONBOARDING_KEY)
      .then((v) => setShowSkipBanner(v === 'skipped'))
      .catch(() => {});
  }, [user]);

  // Seed instantly from cache; Supabase fetch overwrites on focus
  useEffect(() => {
    AsyncStorage.getItem(CURRENT_STEP_KEY)
      .then((raw) => { if (raw) setCompletedStepIds(new Set(JSON.parse(raw))); })
      .catch(() => {});
  }, []);

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_progress')
      .select('step_id, completed')
      .eq('user_id', user.id);
    const ids = [...(data ?? []).filter((r) => r.completed).map((r) => r.step_id)];
    setCompletedStepIds(new Set(ids));
    AsyncStorage.setItem(CURRENT_STEP_KEY, JSON.stringify(ids)).catch(() => {});
  }, [user]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  // Re-fetch silently whenever Home tab gains focus (e.g., after completing a step)
  useFocusEffect(useCallback(() => { fetchProgress(); }, [fetchProgress]));

  const fetchAllDeadlines = useCallback(async () => {
    if (!user) return [];
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('user_deadlines')
      .select('id, title, deadline_date')
      .eq('user_id', user.id)
      .gte('deadline_date', today)
      .order('deadline_date', { ascending: true });
    const list = data ?? [];
    setAllDeadlines(list);
    setNextDeadline(list[0] ?? null);
    return list;
  }, [user]);

  useEffect(() => { fetchAllDeadlines(); }, [fetchAllDeadlines]);
  useFocusEffect(useCallback(() => { fetchAllDeadlines(); }, [fetchAllDeadlines]));

  const fetchDocProgress = useCallback(async () => {
    if (!user || !currentStep || !pathway) { setStepDocProgress(null); return; }
    const stepId  = String(currentStep.id ?? (currentStepIdx + 1));
    const mission = getMissionData(pathway.id, currentStep.id) ?? buildDefaultMissionData(currentStep);
    const docs    = mission?.documents ?? [];
    const required = docs.filter((d) => d.required !== false);
    if (!required.length) { setStepDocProgress(null); return; }
    const { data } = await supabase
      .from('user_documents')
      .select('document_name, status')
      .eq('user_id', user.id)
      .eq('step_id', stepId)
      .catch(() => ({ data: null }));
    const statusMap = {};
    (data ?? []).forEach((r) => { statusMap[r.document_name] = r.status; });
    const gathered = required.filter((d) => {
      const s = statusMap[d.name];
      return s === 'gathered' || s === 'uploaded';
    }).length;
    setStepDocProgress({ gathered, required: required.length });
  }, [user, currentStep, currentStepIdx, pathway]);

  useEffect(() => { fetchDocProgress(); }, [fetchDocProgress]);
  useFocusEffect(useCallback(() => { fetchDocProgress(); }, [fetchDocProgress]));

  const fetchTotalDocs = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('user_documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['gathered', 'uploaded'])
      .catch(() => ({ count: 0 }));
    setTotalDocsGathered(count ?? 0);
  }, [user]);

  useEffect(() => { fetchTotalDocs(); }, [fetchTotalDocs]);
  useFocusEffect(useCallback(() => { fetchTotalDocs(); }, [fetchTotalDocs]));

  useEffect(() => {
    if (profile?.current_streak != null) setStreak(profile.current_streak);
  }, [profile]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    AsyncStorage.getItem(CHALLENGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.date === today) { setChallengeAnswer(saved.answer); setChallengeDone(true); }
      })
      .catch(() => {});
  }, []);

  // ── Notification scheduler ────────────────────────────────────────────────────

  // Keep a ref with the latest params so the AppState listener doesn't go stale
  useEffect(() => {
    notifParamsRef.current = {
      profile,
      currentStep,
      completedCount,
      totalSteps,
      nextDeadline,
      allDeadlines,
      stepDocProgress,
      totalDocsGathered,
      isPro,
      notifPrefs: profile?.notification_preferences ?? {},
    };
  });

  // Run once after user + profile first load
  const hasScheduledRef = useRef(false);
  useEffect(() => {
    if (!user || !profile || hasScheduledRef.current) return;
    hasScheduledRef.current = true;
    scheduleAllUserNotifications(notifParamsRef.current).catch(() => {});
  }, [user, profile]);

  // Re-schedule every time the app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      scheduleAllUserNotifications(notifParamsRef.current).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  // Show notification permission modal the first time completedCount crosses 1
  // useEffect (not useFocusEffect) so it fires when Supabase data lands, not on focus
  useEffect(() => {
    if (completedCount < 1) return;
    hasAskedNotificationPermission().then((asked) => {
      if (!asked) setShowNotifModal(true);
    });
  }, [completedCount]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleChallengeAnswer = useCallback(async (option) => {
    if (challengeDone || !challengeQ) return;
    const today = new Date().toISOString().split('T')[0];
    const isCorrect = option === challengeQ.correct;
    if (isCorrect) successHaptic(); else lightHaptic();
    setChallengeAnswer(option);
    setChallengeDone(true);
    await AsyncStorage.setItem(CHALLENGE_KEY, JSON.stringify({ date: today, answer: option })).catch(() => {});
    if (user) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      supabase.from('profiles')
        .update({ current_streak: newStreak, last_active_date: today })
        .eq('id', user.id)
        .catch(() => {});
    }
  }, [challengeDone, challengeQ, user, streak]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      <NotificationPermissionModal
        visible={showNotifModal}
        onEnable={async () => {
          await markNotificationPermissionAsked();
          setShowNotifModal(false);
          const granted = await registerForPushNotifications();
          if (granted) {
            await scheduleAllUserNotifications(notifParamsRef.current).catch(() => {});
          } else {
            Alert.alert(
              'Notifications Blocked',
              'To get reminders, enable notifications for PathwayUSA in your device Settings.',
              [{ text: 'OK' }],
            );
          }
        }}
        onDismiss={async () => {
          await markNotificationPermissionAsked();
          setShowNotifModal(false);
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Skip-onboarding banner */}
        {showSkipBanner && (
          <View style={styles.skipBanner}>
            <Ionicons name="map-outline" size={20} color={colors.primary} />
            <TouchableOpacity style={{ flex: 1 }} onPress={async () => { if (user) await AsyncStorage.removeItem(`${ONBOARDING_KEY}/${user.id}`).catch(() => {}); refreshOnboarding(); }} activeOpacity={0.8}>
              <Text style={styles.skipBannerTxt}>Personalize your roadmap → Takes 2 minutes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => { setShowSkipBanner(false); await AsyncStorage.setItem(user ? `${ONBOARDING_KEY}/${user.id}` : ONBOARDING_KEY, 'dismissed'); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={18} color="#888" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={colors.gradient}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
        >
          <View style={styles.headerTopBar}>
            <PathwayLogo variant="white" size={84} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => { lightHaptic(); navigation.navigate('Notifications'); }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            </View>
          </View>

          {isGcPath ? (
            <CitizenshipCountdownCard profile={profile} navigation={navigation} variant="hero" />
          ) : (
            <>
              <Text style={styles.greeting}>
                {getGreeting(t)}{firstName ? `, ${firstName}` : ''}!{countryFlag ? ` ${countryFlag}` : ''}
              </Text>
              <Text style={styles.heroTitle}>
                {pathway?.title ?? 'Your Path to U.S. Citizenship'}
              </Text>
              <Text style={styles.heroSub}>
                {pathway?.subtitle ?? 'Step-by-step guidance for your immigration journey'}
              </Text>
            </>
          )}
        </LinearGradient>

        {/* ── TODAY CARD — current step, one sentence of context, one button ──── */}
        {totalSteps > 0 && completedCount >= totalSteps && completedCount > 0 ? (
          <View style={[styles.currentStepCard, { borderColor: '#27AE60', backgroundColor: '#EAF7EE' }]}>
            <Text style={{ fontSize: 28, textAlign: 'center' }}>🎉</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#27AE60', textAlign: 'center' }}>
              You've completed your journey!
            </Text>
            <TouchableOpacity
              style={[styles.progressBtn, { backgroundColor: '#27AE60' }]}
              onPress={() => lightHaptic()}
              activeOpacity={0.85}
            >
              <Text style={styles.progressBtnTxt}>View Certificate</Text>
            </TouchableOpacity>
          </View>
        ) : currentStep && totalSteps > 0 ? (
          <View style={styles.currentStepCard}>
            <View style={styles.currentStepHdr}>
              <View style={styles.currentStepIcon}>
                <Ionicons name="flag" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.currentStepLabel}>
                  STEP {currentStepIdx + 1} OF {totalSteps}
                </Text>
                <Text style={styles.currentStepTitle} numberOfLines={2}>
                  {currentStep.title}
                </Text>
              </View>
            </View>
            {currentStep.description ? (
              <Text style={styles.docProgressTxt} numberOfLines={2}>
                {currentStep.description}
              </Text>
            ) : null}
            <View style={styles.stepProgressRow} accessibilityLabel={`${doneSteps} of ${totalSteps} steps done`}>
              <View style={styles.stepProgressTrack}>
                <View style={[styles.stepProgressFill, { width: `${Math.max(Math.round((doneSteps / totalSteps) * 100), 3)}%` }]} />
              </View>
              <Text style={styles.stepProgressTxt}>{doneSteps}/{totalSteps} done</Text>
            </View>
            <TouchableOpacity
              style={styles.progressBtn}
              onPress={() => {
                lightHaptic();
                navigation.navigate('StepMission', {
                  step: currentStep,
                  stepIndex: currentStepIdx,
                  totalSteps,
                  pathway,
                  steps,
                });
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.progressBtnTxt}>Continue Step</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── VOICE CONTROL BAR — placeholder for Phase 7, hidden by default ──── */}
        {VOICE_BAR_ENABLED && (
          <View style={styles.voiceBar}>
            <View style={styles.voicePlayBtn}>
              <Ionicons name="play" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.voiceBarTitle}>Read this step to me</Text>
              <Text style={styles.voiceBarSub}>Coming soon</Text>
            </View>
            <Ionicons name="language" size={18} color="#9FB0BA" />
          </View>
        )}

        {/* ── TIME-SENSITIVE ALERT — one, amber, only if applicable ──────────── */}
        {nextDeadline && (() => {
          const diff      = new Date(nextDeadline.deadline_date + 'T12:00:00') - new Date();
          const daysLeft  = Math.ceil(diff / 86400000);
          const dateLabel = new Date(nextDeadline.deadline_date + 'T12:00:00').toLocaleDateString(
            'en-US', { month: 'short', day: 'numeric', year: 'numeric' },
          );
          return (
            <View style={[styles.deadlineCard, { borderLeftColor: colors.warning, marginTop: 12 }]}>
              <View style={styles.deadlineHdr}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Next Deadline
                  </Text>
                  <Text style={styles.deadlineTitle}>{nextDeadline.title}</Text>
                </View>
                <TouchableOpacity onPress={() => { lightHaptic(); navigation.navigate('Deadlines'); }} activeOpacity={0.75}>
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>Manage →</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.warning }}>
                {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`}
                {'  '}
                <Text style={{ fontWeight: '500', color: '#7F8C8D', fontSize: 13 }}>{dateLabel}</Text>
              </Text>
              <TouchableOpacity
                style={styles.deadlineCta}
                onPress={async () => {
                  const ok = await registerForPushNotifications();
                  if (!ok) {
                    Alert.alert('Notifications Off', 'Enable notifications in device Settings to get deadline reminders.');
                    return;
                  }
                  await scheduleDeadlineNotifications(nextDeadline);
                  Alert.alert('Reminders Set ✓', "You'll be notified 30, 7, and 1 day before this deadline.");
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={14} color={colors.warning} />
                <Text style={[styles.deadlineCtaTxt, { color: colors.warning }]}>Set Reminder →</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* ── LIST ROWS — documents, find help, full roadmap ──────────────────── */}
        <View style={styles.listSection}>
          {[
            {
              icon: 'folder-outline', label: 'My documents',
              meta: stepDocProgress ? `${stepDocProgress.gathered} saved · ${Math.max(0, stepDocProgress.required - stepDocProgress.gathered)} still needed` : 'Track what you need',
              screen: 'Documents',
            },
            {
              icon: 'map-outline', label: 'See my full roadmap',
              meta: `${doneSteps} of ${totalSteps} steps done`,
              screen: 'Guide',
            },
            {
              icon: 'location-outline', label: 'Find help near you',
              meta: 'Legal aid, health, housing',
              screen: 'Resources',
            },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.screen}
              style={[styles.listRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => { lightHaptic(); navigation.navigate(row.screen); }}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <View style={[styles.listRowIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={row.icon.replace('-outline', '')} size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listRowLabel}>{row.label}</Text>
                <Text style={styles.listRowMeta}>{row.meta}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── OFFICIAL IMMIGRATION UPDATES ────────────────────────────────────── */}
        <NewsHomeCard
          navigation={navigation}
          userCtx={{ status: intakeStatus, goals: intakeGoals, country: intakeData?.country_of_birth ?? profile?.country_of_birth ?? null }}
        />

        {/* ── DAILY CHALLENGE CARD ───────────────────────────────────────────── */}
        {challengeQ && (
          <View style={styles.challengeCard}>
            {/* Header row */}
            <View style={styles.challengeHdr}>
              <Text style={{ fontSize: 28 }}>🔥</Text>
              <View style={styles.challengeHdrText}>
                <Text style={styles.challengeLabel}>{t('home_daily_challenge')}</Text>
                {journeyDays !== null ? (
                  <Text style={styles.challengeStreakTxt}>Day {journeyDays + 1} of your journey</Text>
                ) : (
                  <Text style={styles.challengeStreakTxt}>Daily question</Text>
                )}
              </View>
              {challengeDone && (
                <View style={styles.donePill}>
                  <Text style={styles.donePillTxt}>{t('home_done_check')}</Text>
                </View>
              )}
            </View>

            {/* Week dots */}
            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day, i) => {
                const isToday  = i === todayDow;
                const isActive = activeDows.has(i);
                const isFuture = i > todayDow;
                return (
                  <View key={i} style={styles.weekDot}>
                    <View style={[
                      styles.weekCircle,
                      isActive ? { backgroundColor: colors.primary }
                        : isToday ? { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary }
                        : { backgroundColor: '#E8ECE8' },
                    ]}>
                      {isActive && <Ionicons name="checkmark" size={14} color="#fff" />}
                      {isToday && !isActive && (
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
                      )}
                    </View>
                    <Text style={[
                      styles.weekDayLabel,
                      isToday && { color: colors.primary, fontWeight: '800' },
                      isFuture && { color: '#B0B7BB' },
                    ]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Question */}
            <Text style={styles.challengeQ}>{challengeQ.question}</Text>

            {/* Options */}
            <View style={styles.challengeOpts}>
              {challengeQ.options.map((opt) => {
                const isChosen  = challengeAnswer === opt;
                const isCorrect = opt === challengeQ.correct;
                let optStyle = styles.challengeOpt;
                let txtStyle = styles.challengeOptTxt;
                if (challengeDone) {
                  if (isCorrect) {
                    optStyle = [styles.challengeOpt, styles.challengeOptCorrect];
                    txtStyle = [styles.challengeOptTxt, styles.challengeOptCorrectTxt];
                  } else if (isChosen) {
                    optStyle = [styles.challengeOpt, styles.challengeOptWrong];
                    txtStyle = [styles.challengeOptTxt, styles.challengeOptWrongTxt];
                  }
                }
                return (
                  <TouchableOpacity
                    key={opt}
                    style={optStyle}
                    onPress={() => handleChallengeAnswer(opt)}
                    activeOpacity={challengeDone ? 1 : 0.75}
                    disabled={challengeDone}
                  >
                    <Text style={txtStyle}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Explanation */}
            {challengeDone && (
              <View style={styles.challengeExplain}>
                <Text style={[
                  styles.challengeResultTxt,
                  { color: challengeAnswer === challengeQ.correct ? '#27AE60' : '#E74C3C' },
                ]}>
                  {challengeAnswer === challengeQ.correct
                    ? t('home_answer_correct')
                    : t('home_answer_incorrect')}
                </Text>
                <Text style={styles.challengeExplainTxt}>{challengeQ.explanation}</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}
