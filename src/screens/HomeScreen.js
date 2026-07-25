import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Alert, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import PressableScale from '../components/PressableScale';
import { lightHaptic, successHaptic } from '../utils/haptics';
import { QUESTIONS } from '../data/civicsQuestions';
import { supabase } from '../lib/supabase';
import { getPathway } from '../lib/pathwayRouter';
import { getMissionData, buildDefaultMissionData } from '../lib/stepMissionData';
import { BADGE_DEFS, hasBadge } from '../lib/badges';
import { ONBOARDING_KEY, ONBOARDING_DATA_KEY } from './onboarding/IntakeStack';
import { useOnboardingRefresh } from '../context/OnboardingContext';
import UserAvatar from '../components/UserAvatar';
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
import { useSubscription } from '../hooks/useSubscription';

const { width } = Dimensions.get('window');
const INTAKE_DATA_KEY    = ONBOARDING_DATA_KEY;
const CHALLENGE_KEY      = '@pathwayusa/daily_challenge';
const CURRENT_STEP_KEY   = '@pathwayusa/current_step_id_cache';

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const COUNTRY_FLAGS = {
  mexico: '🇲🇽', brazil: '🇧🇷', india: '🇮🇳', china: '🇨🇳', philippines: '🇵🇭',
  vietnam: '🇻🇳', el_salvador: '🇸🇻', cuba: '🇨🇺', dominican_republic: '🇩🇴',
  guatemala: '🇬🇹', haiti: '🇭🇹', korea: '🇰🇷', jamaica: '🇯🇲', colombia: '🇨🇴',
  nigeria: '🇳🇬', ghana: '🇬🇭', ethiopia: '🇪🇹', nepal: '🇳🇵', ukraine: '🇺🇦',
  honduras: '🇭🇳', venezuela: '🇻🇪', peru: '🇵🇪', ecuador: '🇪🇨', argentina: '🇦🇷',
};

const TESTIMONIALS = [
  { name: 'Maria G.',        city: 'Miami, FL',       rating: 5, quote: 'PathwayUSA helped me understand each step. I passed my citizenship test on the first try!' },
  { name: 'Jean-Pierre M.',  city: 'New York, NY',    rating: 5, quote: 'The daily quiz kept me consistent. I felt prepared and confident at my naturalization interview.' },
  { name: 'Ana L.',          city: 'Los Angeles, CA', rating: 5, quote: 'Finally an app that explains immigration in plain language. My family is so grateful.' },
];

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
    container: { flex: 1, backgroundColor: '#F5F7F5' },

    // Header
    header: { paddingHorizontal: 24, paddingBottom: 72 },
    headerTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
    settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
greeting: { fontSize: 15, color: 'rgba(255,255,255,0.72)', marginBottom: 10 },
    heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', lineHeight: 34, marginBottom: 8 },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 21 },

    // Progress card — overlaps header
    progressCard: { marginHorizontal: 20, marginTop: -54, backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14, ...SHADOWS.medium, zIndex: 10 },
    progressTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    progressLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3 },
    progressTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', lineHeight: 22 },
    progressPct: { fontSize: 34, fontWeight: '900', color: colors.primary, lineHeight: 38 },
    progressBarBg: { height: 8, backgroundColor: '#E8ECE8', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
    progressMeta: { fontSize: 12, color: '#7F8C8D' },
    progressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 12, height: 48 },
    progressBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

    // Quick actions
    quickGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 20 },
    quickItem: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: '#fff', ...SHADOWS.small },
    quickIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    quickLabel: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', lineHeight: 15 },

    // Daily challenge card
    challengeCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 14, ...SHADOWS.small },
    challengeHdr: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    challengeHdrText: { flex: 1, gap: 1 },
    challengeLabel: { fontSize: 11, fontWeight: '900', color: '#F5A623', textTransform: 'uppercase', letterSpacing: 0.8 },
    challengeStreakTxt: { fontSize: 20, fontWeight: '900', color: '#1A1A2E' },
    donePill: { backgroundColor: '#EAF7EE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    donePillTxt: { fontSize: 12, fontWeight: '700', color: '#27AE60' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
    weekDot: { alignItems: 'center', gap: 5 },
    weekCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    weekDayLabel: { fontSize: 10, fontWeight: '600', color: '#BDC3C7' },
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

    // Trust stats
    statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20, borderRadius: 16, paddingVertical: 18, ...SHADOWS.small },
    statItem: { flex: 1, alignItems: 'center', gap: 2 },
    statNumber: { fontSize: 20, fontWeight: '900', color: colors.primary },
    statLabel: { fontSize: 11, color: '#7F8C8D', textAlign: 'center' },
    statDivider: { width: 1, backgroundColor: '#E8ECE8' },

    // Testimonial card
    testimonialCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12, ...SHADOWS.small },
    testimonialChip: { fontSize: 10, fontWeight: '800', color: '#BDC3C7', textTransform: 'uppercase', letterSpacing: 0.8 },
    testimonialHdr: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    testimonialMeta: { flex: 1, gap: 2 },
    testimonialName: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
    testimonialCity: { fontSize: 12, color: '#7F8C8D' },
    testimonialStars: { flexDirection: 'row', gap: 1 },
    testimonialQuote: { fontSize: 14, color: '#444', lineHeight: 22, fontStyle: 'italic' },

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

    // Journey horizontal cards
    journeyCard: { width: 160, backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 4, ...SHADOWS.small },

    // Current step card
    currentStepCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: '#fff', borderRadius: 20, borderLeftWidth: 5, borderLeftColor: colors.primary, padding: 20, gap: 12, ...SHADOWS.small },
    currentStepHdr: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    currentStepIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    currentStepLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
    currentStepTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', lineHeight: 21 },

    // Doc progress row (below current step card)
    docProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, ...SHADOWS.small },
    docProgressTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1A1A2E' },

    // Bottom tagline bar
    taglineBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1A2E', marginHorizontal: 20, marginTop: 24, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16 },
    taglineTxt: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
    taglineBtn: { backgroundColor: '#F5A623', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexShrink: 0 },
    taglineBtnTxt: { fontSize: 12, fontWeight: '900', color: '#fff' },
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
  const earnedBadgeCount = BADGE_DEFS.filter((b) => hasBadge(profile?.badges, b.id)).length;

  // Intake / onboarding
  const [intakeData, setIntakeData]       = useState(null);
  const [showSkipBanner, setShowSkipBanner] = useState(false);

  // Progress — Set of completed step_ids fetched from Supabase
  const [completedStepIds, setCompletedStepIds] = useState(new Set());
  const progressAnim = useRef(new Animated.Value(0)).current;

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
  const journeyPct   = totalSteps > 0 ? Math.min(Math.round((completedCount / totalSteps) * 100), 100) : 0;
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

  const testimonial = TESTIMONIALS[Math.floor(Date.now() / 86400000) % TESTIMONIALS.length];
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

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: journeyPct / 100,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [journeyPct]);

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

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
            <PathwayLogo variant="icon" size={32} />
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

          <Text style={styles.greeting}>
            {getGreeting(t)}{firstName ? `, ${firstName}` : ''}!{countryFlag ? ` ${countryFlag}` : ''}
          </Text>
          <Text style={styles.heroTitle}>
            {pathway?.title ?? 'Your Path to U.S. Citizenship'}
          </Text>
          <Text style={styles.heroSub}>
            {pathway?.subtitle ?? 'Step-by-step guidance for your immigration journey'}
          </Text>
        </LinearGradient>

        {/* ── PROGRESS CARD ──────────────────────────────────────────────────── */}
        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.progressLabel}>{t('home_your_progress')}</Text>
              <Text style={styles.progressTitle} numberOfLines={1}>
                {pathway?.title ?? 'Immigration Journey'}
              </Text>
            </View>
            <Text style={styles.progressPct}>{journeyPct}%</Text>
          </View>

          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: progressBarWidth }]} />
          </View>

          <Text style={styles.progressMeta}>
            {journeyPct === 0
              ? t('home_start_first')
              : `${doneSteps} ${t('home_of')} ${totalSteps} ${t('home_steps_complete')}`}
          </Text>

          <PressableScale
            style={styles.progressBtn}
            onPress={() => navigation.navigate('Guide')}
            haptic={false}
            accessibilityRole="button"
          >
            <Text style={styles.progressBtnTxt}>
              {journeyPct === 0 ? t('home_start_step_1') : t('home_continue_journey')}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </PressableScale>
        </View>

        {/* ── CURRENT STEP CARD ─────────────────────────────────────────────── */}
        {currentStep && totalSteps > 0 && completedCount < totalSteps && (
          <View style={styles.currentStepCard}>
            <View style={styles.currentStepHdr}>
              <View style={styles.currentStepIcon}>
                <Ionicons name="flag" size={20} color={colors.primary} />
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
              <Text style={styles.progressBtnTxt}>Continue Step →</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── DOCUMENT PROGRESS (below current step card) ────────────────────── */}
        {stepDocProgress && currentStep && completedCount < totalSteps && (
          <TouchableOpacity
            style={styles.docProgressRow}
            onPress={() => {
              lightHaptic();
              navigation.navigate('StepMission', {
                step: currentStep,
                stepIndex: currentStepIdx,
                totalSteps,
                pathway,
                steps,
                initialTab: 2,
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={stepDocProgress.gathered >= stepDocProgress.required ? 'checkmark-circle' : 'document-text-outline'}
              size={16}
              color={stepDocProgress.gathered >= stepDocProgress.required ? '#27AE60' : colors.primary}
            />
            <Text style={styles.docProgressTxt}>
              Documents: {stepDocProgress.gathered} of {stepDocProgress.required} gathered
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* ── ALL STEPS COMPLETE ─────────────────────────────────────────────── */}
        {totalSteps > 0 && completedCount >= totalSteps && completedCount > 0 && (
          <View style={[styles.currentStepCard, { borderLeftColor: '#27AE60', backgroundColor: '#EAF7EE' }]}>
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
        )}

        {/* ── DEADLINE COUNTDOWN CARD ────────────────────────────────────────── */}
        {(() => {
          if (nextDeadline) {
            const diff      = new Date(nextDeadline.deadline_date + 'T12:00:00') - new Date();
            const daysLeft  = Math.ceil(diff / 86400000);
            const urgency   = daysLeft > 60 ? '#27AE60' : daysLeft > 30 ? '#E67E22' : '#E74C3C';
            const dateLabel = new Date(nextDeadline.deadline_date + 'T12:00:00').toLocaleDateString(
              'en-US', { month: 'short', day: 'numeric', year: 'numeric' },
            );
            return (
              <View style={[styles.deadlineCard, { borderLeftColor: urgency, marginTop: 12 }]}>
                <View style={styles.deadlineHdr}>
                  <Ionicons name="calendar-outline" size={20} color={urgency} />
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
                <Text style={{ fontSize: 15, fontWeight: '800', color: urgency }}>
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
                  <Ionicons name="notifications-outline" size={14} color={urgency} />
                  <Text style={[styles.deadlineCtaTxt, { color: urgency }]}>Set Reminder →</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <TouchableOpacity
              style={[styles.deadlineCard, { borderLeftColor: '#BDC3C7', marginTop: 12 }]}
              onPress={() => { lightHaptic(); navigation.navigate('Deadlines'); }}
              activeOpacity={0.85}
            >
              <View style={styles.deadlineHdr}>
                <Ionicons name="calendar-outline" size={20} color="#BDC3C7" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#BDC3C7', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Deadlines
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A2E' }}>
                    Add your first deadline →
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#BDC3C7" />
              </View>
              <Text style={styles.deadlineSub}>
                Track filing deadlines, renewals, and court dates. Get reminders 30, 7, and 1 day before.
              </Text>
            </TouchableOpacity>
          );
        })()}

        {/* ── CITIZENSHIP ELIGIBILITY CARD (Green Card holders only) ─────────── */}
        {isGcPath && (
          <CitizenshipCountdownCard profile={profile} navigation={navigation} />
        )}

        {/* ── QUICK ACTIONS ──────────────────────────────────────────────────── */}
        <View style={styles.quickGrid}>
          {[
            { icon: 'map',       label: 'My\nRoadmap',  color: colors.primary, bg: colors.primaryLight, screen: 'Guide' },
            { icon: 'school',    label: 'Practice\nQuiz', color: '#2A8B7A', bg: '#E8F4F1', screen: 'Learn'    },
            { icon: 'documents', label: 'My\nDocuments', color: '#2196F3', bg: '#E3F2FD', screen: 'Documents' },
            { icon: 'briefcase', label: 'Find\nAttorney', color: '#F5A623', bg: '#FFF4E0', screen: 'Legal'    },
            { icon: 'ribbon',    label: `${earnedBadgeCount}/${BADGE_DEFS.length}\nBadges`, color: '#8E44AD', bg: '#F3E8FA', screen: 'Badges' },
          ].map((action) => (
            <TouchableOpacity
              key={action.screen}
              style={styles.quickItem}
              onPress={() => { lightHaptic(); navigation.navigate(action.screen); }}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <View style={[styles.quickIconWrap, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
                      isFuture && { color: '#E8ECE8' },
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

        {/* ── TRUST STATS ROW ────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { num: '2.1M+', label: 'Naturalized' },
            { num: '15K+',  label: 'Resources'   },
            { num: '500+',  label: 'Attorneys'   },
          ].map((stat, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stat.num}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── COMMUNITY TESTIMONIAL ──────────────────────────────────────────── */}
        <View style={styles.testimonialCard}>
          <Text style={styles.testimonialChip}>{t('home_community_story')}</Text>
          <View style={styles.testimonialHdr}>
            <UserAvatar seed={testimonial.name} size={44} />
            <View style={styles.testimonialMeta}>
              <Text style={styles.testimonialName}>{testimonial.name}</Text>
              <Text style={styles.testimonialCity}>{testimonial.city}</Text>
            </View>
            <View style={styles.testimonialStars}>
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Text key={i} style={{ fontSize: 11 }}>⭐</Text>
              ))}
            </View>
          </View>
          <Text style={styles.testimonialQuote}>"{testimonial.quote}"</Text>
        </View>


        {/* ── YOUR JOURNEY (horizontal snapshot cards) ───────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#1A1A2E', marginBottom: 12 }}>
            {t('home_your_journey')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>

            {/* Card 1: Days on your journey */}
            <View style={styles.journeyCard}>
              <Text style={{ fontSize: 22 }}>🗓️</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Your Journey
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: colors.primary, lineHeight: 34 }}>
                {journeyDays ?? '—'}
              </Text>
              <Text style={{ fontSize: 11, color: '#7F8C8D' }}>days since you started</Text>
            </View>

            {/* Card 2: Documents gathered this step */}
            <TouchableOpacity
              style={styles.journeyCard}
              onPress={() => {
                lightHaptic();
                if (currentStep) {
                  navigation.navigate('StepMission', { step: currentStep, stepIndex: currentStepIdx, totalSteps, pathway, steps, initialTab: 2 });
                } else {
                  navigation.navigate('Guide');
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 22 }}>📁</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#2196F3', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Documents
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#2196F3', lineHeight: 30 }}>
                {stepDocProgress ? `${stepDocProgress.gathered}/${stepDocProgress.required}` : '—'}
              </Text>
              <Text style={{ fontSize: 11, color: '#7F8C8D' }}>gathered this step</Text>
            </TouchableOpacity>

            {/* Card 3: Next deadline — only shown when a deadline exists */}
            {nextDeadline && (() => {
              const diff     = new Date(nextDeadline.deadline_date + 'T12:00:00') - new Date();
              const daysLeft = Math.ceil(diff / 86400000);
              const urgency  = daysLeft > 60 ? '#27AE60' : daysLeft > 30 ? '#E67E22' : '#E74C3C';
              return (
                <TouchableOpacity
                  style={[styles.journeyCard, { borderTopWidth: 3, borderTopColor: urgency }]}
                  onPress={() => { lightHaptic(); navigation.navigate('Deadlines'); }}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 22 }}>⏰</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: urgency, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Next Deadline
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: urgency, lineHeight: 26 }}>
                    {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#7F8C8D', lineHeight: 15 }} numberOfLines={2}>
                    {nextDeadline.title}
                  </Text>
                </TouchableOpacity>
              );
            })()}

            {/* Card 4: Citizenship eligibility (Green Card holders only) */}
            {isGcPath && (() => {
              const gcDate    = profile?.green_card_date;
              const pathYears = profile?.gc_path_years ?? 5;
              if (!gcDate) {
                return (
                  <TouchableOpacity
                    style={styles.journeyCard}
                    onPress={() => { lightHaptic(); navigation.navigate('TravelTracker'); }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 22 }}>🎖️</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#27AE60', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      Citizenship
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A2E', lineHeight: 17, marginTop: 4 }}>
                      Add GC date →
                    </Text>
                    <Text style={{ fontSize: 11, color: '#7F8C8D' }}>to see countdown</Text>
                  </TouchableOpacity>
                );
              }
              const gcStart  = new Date(gcDate + 'T00:00:00');
              const eligible = new Date(gcStart);
              eligible.setFullYear(eligible.getFullYear() + pathYears);
              const remaining = eligible - new Date();
              const isPast    = remaining <= 0;
              const absDays   = Math.ceil(Math.abs(remaining) / 86400000);
              const years     = Math.floor(absDays / 365);
              const months    = Math.floor((absDays % 365) / 30);
              return (
                <View style={[styles.journeyCard, { borderTopWidth: 3, borderTopColor: '#27AE60' }]}>
                  <Text style={{ fontSize: 22 }}>🎖️</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#27AE60', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Citizenship
                  </Text>
                  {isPast ? (
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#27AE60', lineHeight: 17, marginTop: 4 }}>
                      Eligible now!
                    </Text>
                  ) : (
                    <>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A2E', lineHeight: 24 }}>
                        {years > 0 ? `${years}y ` : ''}{months > 0 ? `${months}mo` : `${absDays}d`}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#7F8C8D' }}>until eligible</Text>
                    </>
                  )}
                </View>
              );
            })()}

            {/* Card 5: Next step preview — only shown when actively in progress */}
            {currentStep && (
              <TouchableOpacity
                style={styles.journeyCard}
                onPress={() => {
                  lightHaptic();
                  navigation.navigate('StepMission', { step: currentStep, stepIndex: currentStepIdx, totalSteps, pathway, steps });
                }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 22 }}>📋</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Up Next
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1A1A2E', lineHeight: 18 }}>
                  {currentStep.title}
                </Text>
                <Text style={{ fontSize: 11, color: '#7F8C8D', lineHeight: 16 }}>
                  Step {currentStepIdx + 1} of {totalSteps}
                </Text>
              </TouchableOpacity>
            )}

          </ScrollView>
        </View>

        {/* ── BOTTOM TAGLINE BAR ──────────────────────────────────────────────── */}
        <View style={styles.taglineBar}>
          <Ionicons name="people" size={18} color="rgba(255,255,255,0.7)" />
          <Text style={styles.taglineTxt}>
            You're not just another case number. We're with you every step of the way.
          </Text>
          <TouchableOpacity
            style={styles.taglineBtn}
            onPress={() => { lightHaptic(); navigation.navigate('Guide'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.taglineBtnTxt}>Continue →</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}
