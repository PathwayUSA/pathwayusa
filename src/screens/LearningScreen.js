import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  ActivityIndicator, Animated, Modal, Share, Alert, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import { useSpeech } from '../hooks/useSpeech';
import { cacheData, getCachedData } from '../hooks/useOffline';
import { useAuth } from '../context/AuthContext';
import { TIPS } from '../data/immigrationTips';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../context/SubscriptionContext';
import { useTestVersion } from '../context/TestVersionContext';
import { DAILY_QUIZ_LIMIT, DAILY_QUIZ_KEY } from '../constants/tiers';
import {
  saveQuizSession, saveQuizAnswers, syncFlashcardProgress, loadWrongCountsFromSupabase,
} from '../lib/quizService';
import { lightHaptic, successHaptic, errorHaptic, selectionHaptic } from '../utils/haptics';
import DragHandle from '../components/DragHandle';
import HelperTip from '../components/HelperTip';
import PressableScale from '../components/PressableScale';
import ShimmerView from '../components/ShimmerView';
import NotificationPrePromptModal from '../components/NotificationPrePromptModal';
import TestVersionModal from '../components/TestVersionModal';
import {
  registerForPushNotifications, scheduleDailyReminder,
  hasAskedNotificationPermission, markNotificationPermissionAsked,
} from '../lib/notifications';
import { LOCATION_QUESTION_IDS, getPersonalizedAnswer, STATE_DATA } from '../data/stateRepresentatives';
import { getStateFromZip } from '../lib/zipToState';
import GlossaryText from '../components/GlossaryText';

const { width } = Dimensions.get('window');
const KEYS = {
  wrongCounts:  '@pathwayusa/wrong_counts_v2',
  sessions:     '@pathwayusa/quiz_sessions_v2',
  tipFavorites: '@pathwayusa/tip_favorites',
  flashProgress:'@pathwayusa/flashcard_progress_v2',
  onboarded:    '@pathwayusa/quiz_onboarded_v2',
  stats:        '@pathwayusa/quiz_stats_v2',
  zipCode:      '@pathwayusa/user_zip_code',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDailyChallenge(questions, size) {
  if (!questions.length) return [];
  const dayNum = Math.floor(Date.now() / 86400000);
  const sorted = [...questions].sort((a, b) => {
    const ha = ((a.id * 1234567 + dayNum * 89) % 1e6);
    const hb = ((b.id * 1234567 + dayNum * 89) % 1e6);
    return ha - hb;
  });
  return sorted.slice(0, size);
}

function getWeakSpots(allQuestions, wrongCounts, limit) {
  return allQuestions
    .filter((q) => (wrongCounts[q.id] || 0) > 0)
    .sort((a, b) => (wrongCounts[b.id] || 0) - (wrongCounts[a.id] || 0))
    .slice(0, limit);
}

function getNextReviewDate(status) {
  const d = new Date();
  d.setDate(d.getDate() + (status === 'know_it' ? 3 : 1));
  return d.toISOString().slice(0, 10);
}

function isDueForReview(fp) {
  if (!fp || !fp.nextReview) return true;
  return fp.nextReview <= new Date().toISOString().slice(0, 10);
}

// ── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f9f9fc' },

    // Study links row (Tips/Stats/Guide — open as modals, not a persistent tab bar)
    studyLinksRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
    studyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
    studyLinkTxt: { fontSize: 12.5, fontWeight: '700', color: '#333' },
    modalCloseBtn: { alignSelf: 'flex-end', padding: 16 },

    // Hero banner
    heroBanner: { paddingHorizontal: 20, paddingVertical: 24 },
    heroTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#fff', lineHeight: TYPOGRAPHY.displayLineHeight, marginBottom: 6 },
    heroFreeBadge: {
      alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
      flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10,
    },
    heroFreeBadgeTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
    // Daily challenge card
    dailyCard: {
      marginHorizontal: 16, marginTop: 4, borderRadius: 18, overflow: 'hidden', ...SHADOWS.medium,
    },
    dailyGrad: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingVertical: 20,
    },
    dailyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dailyInfo: {},
    dailyTitle: { fontSize: 19, fontWeight: '800', color: '#fff' },
    dailySub: { fontSize: 15, color: 'rgba(255,255,255,0.88)', marginTop: 3 },

    // Mode cards
    modesSection: { paddingHorizontal: 16, paddingTop: 18 },
    modesSectionTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, color: colors.text, marginBottom: 14 },
    modesRow: { flexDirection: 'row', gap: 10 },
    modeCard: {
      flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
      alignItems: 'center', gap: 8, ...SHADOWS.small,
      borderWidth: 1.5, borderColor: '#f0f0f0', minHeight: 130,
    },
    modeIconWrap: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    modeTitle: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' },
    modeSub: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 18 },
    modeCount: { fontSize: 13, fontWeight: '700', color: colors.primary },

    // Category section
    catSection: { paddingHorizontal: 16, paddingTop: 18 },
    catSectionTitle: { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, color: colors.text, marginBottom: 14 },
    catChip: {
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999,
      backgroundColor: '#e8e8ea', marginRight: 8, minHeight: 44,
    },
    catChipActive: { backgroundColor: colors.primary },
    catChipTxt: { fontSize: 16, fontWeight: '600', color: '#434653' },
    catChipTxtActive: { color: '#fff' },
    catStartBtn: {
      backgroundColor: colors.primary,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, gap: 8, minHeight: 56,
    },
    catStartBtnTxt: { fontSize: 20, fontWeight: '700', color: '#fff' },

    // Flashcard
    flashWrap: { flex: 1 },
    flashHeader: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', ...SHADOWS.small },
    flashCounter: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8 },
    progressBar: { height: 5, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: 5, backgroundColor: colors.primary, borderRadius: 3 },
    flashModeLabel: { fontSize: 12, color: colors.primary, fontWeight: '700', letterSpacing: 0.5 },
    flashScroll: { flex: 1, padding: 16 },
    flashCardTouchable: { marginBottom: 16 },
    flashCard: {
      backgroundColor: '#fff', borderRadius: 24, padding: 28,
      minHeight: 220, justifyContent: 'center', ...SHADOWS.medium,
      borderWidth: 1, borderColor: '#eee',
    },
    flashSideLabel: {
      fontSize: 11, fontWeight: '800', letterSpacing: 1,
      color: colors.primary, marginBottom: 14, textTransform: 'uppercase',
    },
    flashCatTag: {
      alignSelf: 'flex-start', backgroundColor: colors.primaryLight ?? '#e0faf5',
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 16,
    },
    flashCatTxt: { fontSize: 11, fontWeight: '700', color: colors.primary },
    flashQuestion: { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 30 },
    flashAnswer: { fontSize: 19, fontWeight: '800', color: '#10B981', marginBottom: 10, lineHeight: 28 },
    flashExplanation: { fontSize: 17, color: '#666', lineHeight: 26 },
    flashHint: { fontSize: 16, color: '#bbb', textAlign: 'center', marginTop: 6 },
    flashActions: {
      flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 20,
    },
    knowItBtn: {
      flex: 1, backgroundColor: '#10B981', borderRadius: 14,
      paddingVertical: 18, alignItems: 'center', flexDirection: 'row',
      justifyContent: 'center', gap: 8, minHeight: 58,
    },
    stillLearningBtn: {
      flex: 1, backgroundColor: '#F59E0B', borderRadius: 14,
      paddingVertical: 18, alignItems: 'center', flexDirection: 'row',
      justifyContent: 'center', gap: 8, minHeight: 58,
    },
    flashBtnTxt: { fontSize: 17, fontWeight: '800', color: '#fff' },
    flashDoneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    flashDoneIcon: { marginBottom: 20 },
    flashDoneTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: colors.text, lineHeight: TYPOGRAPHY.displayLineHeight, marginBottom: 10 },
    flashDoneSub: { fontSize: 17, color: '#666', textAlign: 'center', lineHeight: 26 },
    flashDoneStats: { flexDirection: 'row', gap: 20, marginVertical: 24 },
    flashDoneStat: { alignItems: 'center', gap: 4 },
    flashDoneStatVal: { fontSize: 30, fontWeight: '900', color: colors.text },
    flashDoneStatLbl: { fontSize: 14, color: '#aaa', fontWeight: '600' },
    flashDoneBtn: {
      backgroundColor: colors.primary, paddingVertical: 18, paddingHorizontal: 40,
      borderRadius: 14, alignItems: 'center', minHeight: 58,
    },
    flashDoneBtnTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },

    // Quiz (test mode)
    quizHeader: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, ...SHADOWS.small },
    quizCounter: { fontSize: 16, color: '#888', fontWeight: '600', marginBottom: 8 },
    quizCat: { fontSize: 14, color: colors.primary, fontWeight: '700', letterSpacing: 0.5 },
    quizContent: { padding: 20, paddingBottom: 100 },
    questionText: { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 30, marginBottom: 24 },
    optionBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12,
      borderWidth: 1.5, borderColor: '#eee', minHeight: 58, ...SHADOWS.small,
    },
    optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight ?? '#e8f5e9' },
    optionCorrect: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
    optionWrong: { backgroundColor: '#e53935', borderColor: '#e53935' },
    optionDimmed: { opacity: 0.45 },
    optionText: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text, lineHeight: 24 },
    optionTextWhite: { color: '#fff' },
    explanationBox: {
      backgroundColor: '#f0fff8', borderRadius: 14, padding: 18, marginTop: 8,
      borderLeftWidth: 4, borderLeftColor: colors.primary,
    },
    explanationLabel: { fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 8 },
    explanationText: { fontSize: 16, color: '#444', lineHeight: 24 },
    diffBox: {
      backgroundColor: '#fff5f5', borderRadius: 14, padding: 16, marginTop: 8,
      borderLeftWidth: 4, borderLeftColor: '#e53935', gap: 6,
    },
    diffLabel: { fontSize: 12, fontWeight: '800', color: '#c62828', letterSpacing: 0.3 },
    diffRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    diffWrong: { fontSize: 15, fontWeight: '700', color: '#c62828', textDecorationLine: 'line-through' },
    diffCorrect: { fontSize: 15, fontWeight: '800', color: '#2e7d32' },
    quizFooter: { backgroundColor: '#fff', padding: 16, gap: 12, ...SHADOWS.medium },
    feedbackBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start',
    },
    feedbackCorrect: { backgroundColor: '#4caf50' },
    feedbackWrong: { backgroundColor: '#e53935' },
    feedbackText: { color: '#fff', fontWeight: '700', fontSize: 17 },
    nextBtn: {
      backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', paddingVertical: 18, borderRadius: 12, gap: 8, minHeight: 58,
    },
    nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    // Results
    resultHeader: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, gap: 10 },
    resultTitle: { fontSize: 19, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    resultScore: { fontSize: 56, fontWeight: '900', color: '#fff' },
    resultPctWrap: {
      backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20,
    },
    resultPct: { fontSize: 18, fontWeight: '700', color: '#fff' },
    resultMsg: { fontSize: 17, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 4, lineHeight: 26 },
    resultXP: { fontSize: 17, color: '#fff', fontWeight: '700' },
    reviewSection: { paddingHorizontal: 16, paddingTop: 20 },
    reviewTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 14 },
    reviewCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12, ...SHADOWS.small, gap: 10 },
    reviewQuestion: { fontSize: 17, fontWeight: '700', color: colors.text, lineHeight: 25 },
    reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reviewWrong: { fontSize: 16, color: '#e53935', flex: 1, lineHeight: 24 },
    reviewCorrect: { fontSize: 16, color: '#4caf50', fontWeight: '700', flex: 1, lineHeight: 24 },
    reviewExplanation: { fontSize: 15, color: '#888', lineHeight: 22, marginTop: 4 },
    resultActions: { paddingHorizontal: 16, paddingTop: 20, gap: 12, paddingBottom: 40 },
    retryBtn: {
      backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', paddingVertical: 18, borderRadius: 14, gap: 8, minHeight: 58,
    },
    retryBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    homeBtn: {
      borderWidth: 1.5, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8, minHeight: 56,
    },
    homeBtnText: { color: colors.primary, fontSize: 17, fontWeight: '700' },
    // Stats tab
    statsScroll: { flex: 1, backgroundColor: '#f9f9fc' },
    statsContent: { padding: 16 },
    statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, ...SHADOWS.small },
    statVal: { fontSize: 24, fontWeight: '900', color: colors.text },
    statLabel: { fontSize: 13, color: '#888', textAlign: 'center' },
    modeBreakdown: {
      backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, ...SHADOWS.small,
    },
    modeBreakdownTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
    modeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    modeDot: { width: 12, height: 12, borderRadius: 6 },
    modeRowLabel: { fontSize: 16, color: '#666', flex: 1 },
    modeRowVal: { fontSize: 17, fontWeight: '700', color: colors.text },
    recentSection: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, ...SHADOWS.small },
    recentTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
    recentRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10,
    },
    recentMode: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
    recentScore: { fontSize: 15, color: '#888' },
    recentDate: { fontSize: 13, color: '#bbb' },
    // Tips tab
    tipsScroll: { flex: 1, backgroundColor: '#f9f9fc' },
    tipsContent: { paddingHorizontal: 16, paddingBottom: 100 },
    tipsHeader: { paddingHorizontal: 20, paddingVertical: 22 },
    tipsHeaderTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#fff', lineHeight: TYPOGRAPHY.displayLineHeight },
    tipsHeaderSub: { fontSize: 16, color: 'rgba(255,255,255,0.88)', marginTop: 6, lineHeight: 24 },
    tipCard: {
      backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, ...SHADOWS.small,
      flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    },
    tipIconWrap: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    tipRight: { flex: 1 },
    tipCatBadge: {
      alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
      backgroundColor: '#f0f4f8', borderRadius: 8, marginBottom: 8,
    },
    tipCatTxt: { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 0.3 },
    tipTitle: { fontSize: 18, fontWeight: '800', color: colors.text, lineHeight: 26, marginBottom: 6 },
    tipBody: { fontSize: 16, color: '#666', lineHeight: 24 },
    tipActions: { flexDirection: 'row', gap: 14, marginTop: 12, alignItems: 'center' },
    tipFavBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 60, minHeight: 44, paddingVertical: 4 },
    tipFavBtnTxt: { fontSize: 14, color: '#bbb', fontWeight: '600' },
    tipShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 60, minHeight: 44, paddingVertical: 4 },
    tipShareBtnTxt: { fontSize: 14, color: '#bbb', fontWeight: '600' },

    // Guide tab
    guideScroll: { flex: 1 },
    guideContent: { paddingBottom: 100 },
    guideCatBar: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
    },
    guideCard: {
      backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 16, marginTop: 14, padding: 20, ...SHADOWS.small,
    },
    guideCardNum: { fontSize: 13, fontWeight: '800', color: colors.primary, marginBottom: 8, letterSpacing: 0.5 },
    guideCardQ: { fontSize: 18, fontWeight: '700', color: colors.text, lineHeight: 28, marginBottom: 12 },
    guideCardAnswer: { fontSize: 17, fontWeight: '800', color: '#10B981', marginBottom: 10, lineHeight: 26 },
    guideCardExplanation: { fontSize: 16, color: '#666', lineHeight: 25 },
    guideSpeakBtn: {
      marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 8, alignSelf: 'flex-start', minHeight: 44,
    },
    guideSpeakTxt: { fontSize: 15, color: colors.primary, fontWeight: '600' },

    // Location-specific answer panel
    locationPanel: {
      backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14,
      marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#3B82F6',
    },
    locationBadge: {
      fontSize: 11, fontWeight: '800', color: '#1565C0', backgroundColor: '#DBEAFE',
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden',
      alignSelf: 'flex-start', marginBottom: 6,
    },
    locationAnswer:     { fontSize: 15, fontWeight: '700', color: '#1E40AF', lineHeight: 22, marginBottom: 2 },
    locationDisclaimer: { fontSize: 11, color: '#93C5FD', marginTop: 4 },
    locationPromptTxt:  { fontSize: 13, color: '#3B82F6', fontWeight: '600', lineHeight: 20 },

    // Onboarding modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28 },
    modalTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#1a1a2e', lineHeight: TYPOGRAPHY.displayLineHeight, marginBottom: 8 },
    modalSub: { fontSize: 17, color: '#888', marginBottom: 24, lineHeight: 26 },
    onboardCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 14,
      backgroundColor: '#f8f9fa', borderRadius: 16, padding: 18, marginBottom: 14,
    },
    onboardCardIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    onboardCardTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
    onboardCardDesc: { fontSize: 16, color: '#666', lineHeight: 24 },
    onboardBtn: {
      backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 18,
      alignItems: 'center', marginTop: 12, minHeight: 58,
    },
    onboardBtnTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
    backHomeBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingVertical: 14, minHeight: 52,
    },
    backHomeBtnTxt: { fontSize: 17, color: colors.primary, fontWeight: '700' },
  });
}

// ── FlashcardCard ─────────────────────────────────────────────────────────────

function FlashcardCard({ question, onFlip, side, scaleAnim, styles, colors }) {
  const isFront = side === 'front';
  return (
    <Animated.View style={[styles.flashCard, { transform: [{ scaleX: scaleAnim }] }]}>
      <Text style={styles.flashSideLabel}>{isFront ? 'Question' : 'Answer'}</Text>
      <View style={styles.flashCatTag}>
        <Text style={styles.flashCatTxt}>{question.category.toUpperCase()}</Text>
      </View>
      {isFront ? (
        <Text style={styles.flashQuestion}>{question.question}</Text>
      ) : (
        <>
          <Text style={styles.flashAnswer}>{question.correct}</Text>
          <Text style={styles.flashExplanation}>{question.explanation}</Text>
        </>
      )}
    </Animated.View>
  );
}

// ── PracticeView ──────────────────────────────────────────────────────────────

function PracticeView({ questions, flashProgress, onUpdateProgress, onDone, onBack, styles, colors }) {
  const { lang }                  = useLanguage();
  const { speaking, speak, stop, available } = useSpeech(lang);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const pulseLoop  = useRef(null);

  const progRef = useRef({ ...flashProgress });

  const [stackIdx, setStackIdx] = useState(0);
  const [side, setSide] = useState('front');
  const [knowCount, setKnowCount] = useState(0);
  const [stillCount, setStillCount] = useState(0);
  const [flippedCount, setFlippedCount] = useState(0);
  const [stack, setStack] = useState(() => {
    const due = questions.filter((q) => isDueForReview(flashProgress[q.id]));
    const other = questions.filter((q) => !isDueForReview(flashProgress[q.id]));
    return shuffle([...due, ...other]);
  });
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const current = stack[stackIdx];
  const isDone  = stackIdx >= stack.length;

  // Pulse while speaking
  useEffect(() => {
    if (speaking) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [speaking]);

  // Stop speech when card flips or advances
  useEffect(() => { stop(); }, [stackIdx, side]);

  const handleSpeak = useCallback(() => {
    if (speaking) { stop(); return; }
    const text = side === 'front'
      ? current?.question
      : `Correct answer: ${current?.correct}. ${current?.explanation}`;
    if (text) speak(text);
  }, [speaking, speak, stop, side, current]);

  const animateFlip = useCallback((onMid) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
    setTimeout(onMid, 140);
  }, [scaleAnim]);

  const doFlip = useCallback(() => {
    if (side === 'back') return;
    animateFlip(() => {
      setSide('back');
      setFlippedCount((n) => n + 1);
    });
  }, [side, animateFlip]);

  const handleKnowIt = useCallback(() => {
    if (!current) return;
    const prev = progRef.current[current.id] || {};
    const newEntry = {
      status: 'know_it',
      knowCount: (prev.knowCount || 0) + 1,
      stillLearningCount: prev.stillLearningCount || 0,
      nextReview: getNextReviewDate('know_it'),
    };
    progRef.current = { ...progRef.current, [current.id]: newEntry };
    onUpdateProgress(progRef.current);
    setKnowCount((n) => n + 1);
    animateFlip(() => { setSide('front'); setStackIdx((i) => i + 1); });
  }, [current, onUpdateProgress, animateFlip]);

  const handleStillLearning = useCallback(() => {
    if (!current) return;
    const prev = progRef.current[current.id] || {};
    const newEntry = {
      status: 'still_learning',
      knowCount: prev.knowCount || 0,
      stillLearningCount: (prev.stillLearningCount || 0) + 1,
      nextReview: getNextReviewDate('still_learning'),
    };
    progRef.current = { ...progRef.current, [current.id]: newEntry };
    onUpdateProgress(progRef.current);
    setStillCount((n) => n + 1);
    setStack((s) => [...s, current]); // re-queue
    animateFlip(() => { setSide('front'); setStackIdx((i) => i + 1); });
  }, [current, onUpdateProgress, animateFlip]);

  if (isDone) {
    return (
      <View style={styles.flashDoneWrap}>
        <View style={styles.flashDoneIcon}>
          <Ionicons name="checkmark-circle" size={72} color="#10B981" />
        </View>
        <Text style={styles.flashDoneTitle}>Session Complete!</Text>
        <Text style={styles.flashDoneSub}>
          You reviewed {stack.length} cards. {knowCount} known, {stillCount} still learning.
        </Text>
        <View style={styles.flashDoneStats}>
          <View style={styles.flashDoneStat}>
            <Text style={[styles.flashDoneStatVal, { color: '#10B981' }]}>{knowCount}</Text>
            <Text style={styles.flashDoneStatLbl}>Know It</Text>
          </View>
          <View style={styles.flashDoneStat}>
            <Text style={[styles.flashDoneStatVal, { color: '#F59E0B' }]}>{stillCount}</Text>
            <Text style={styles.flashDoneStatLbl}>Still Learning</Text>
          </View>
          <View style={styles.flashDoneStat}>
            <Text style={[styles.flashDoneStatVal, { color: colors.primary }]}>{flippedCount}</Text>
            <Text style={styles.flashDoneStatLbl}>Flipped</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.flashDoneBtn} onPress={() => onDone(knowCount, stillCount, flippedCount)} activeOpacity={0.85}>
          <Text style={styles.flashDoneBtnTxt}>View Stats</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalShown = stack.length;
  const pct = (stackIdx / totalShown) * 100;

  return (
    <View style={styles.flashWrap}>
      <View style={styles.flashHeader}>
        <Text style={styles.flashCounter}>Card {stackIdx + 1} of {totalShown}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.flashModeLabel}>PRACTICE MODE · SPACED REPETITION</Text>
      </View>

      <ScrollView style={styles.flashScroll} contentContainerStyle={{ paddingBottom: 20 }}>
        <TouchableOpacity onPress={doFlip} activeOpacity={0.9} style={styles.flashCardTouchable}>
          <FlashcardCard
            question={current} side={side}
            scaleAnim={scaleAnim} styles={styles} colors={colors}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSpeak}
          disabled={!available}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20, minHeight: 40, marginTop: 4, opacity: available ? 1 : 0.4 }}
          activeOpacity={0.7}
          accessibilityLabel={!available ? 'Read aloud unavailable in this language' : speaking ? 'Stop audio' : (side === 'front' ? 'Read question aloud' : 'Read answer aloud')}
        >
          <Animated.View style={speaking ? { transform: [{ scale: pulseAnim }] } : {}}>
            <Ionicons
              name={speaking ? 'volume-high' : 'volume-medium-outline'}
              size={20}
              color={speaking ? colors.primary : '#ccc'}
            />
          </Animated.View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: speaking ? colors.primary : '#ccc' }}>
            {!available ? 'Read aloud unavailable' : speaking ? 'Playing…' : (side === 'front' ? 'Read question' : 'Read answer')}
          </Text>
        </TouchableOpacity>
        {side === 'front' && <Text style={styles.flashHint}>Tap card to reveal answer</Text>}
      </ScrollView>

      {side === 'back' && (
        <View style={styles.flashActions}>
          <TouchableOpacity style={styles.stillLearningBtn} onPress={handleStillLearning} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.flashBtnTxt}>Still Learning</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.knowItBtn} onPress={handleKnowIt} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.flashBtnTxt}>Know It</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── TestQuizView ──────────────────────────────────────────────────────────────

function TestQuizView({ questions, onFinish, mode, userState, navigation, styles, colors }) {
  const { lang }                              = useLanguage();
  const { speaking, speak, stop, available }  = useSpeech(lang);
  const [speakingTarget, setSpeakingTarget] = useState(null); // 'question' | 'answer'
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const pulseLoop   = useRef(null);

  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected]   = useState(null);
  const [revealed, setRevealed]   = useState(false);
  const [answers, setAnswers]     = useState([]);

  const q      = questions[quizIndex];
  const isLast = quizIndex === questions.length - 1;
  const pct    = ((quizIndex + 1) / questions.length) * 100;

  // Pulse animation while speaking
  useEffect(() => {
    if (speaking) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
      setSpeakingTarget(null);
    }
  }, [speaking]);

  // Stop speech on unmount
  useEffect(() => () => stop(), []);

  const handleSpeak = (target) => {
    if (!available) return;
    if (speakingTarget === target && speaking) { stop(); return; }
    stop();
    setSpeakingTarget(target);
    const text = target === 'question'
      ? q.question
      : `Correct answer: ${q.correct}. ${q.explanation}`;
    setTimeout(() => speak(text), 30);
  };

  const handleSelect = (opt) => {
    if (revealed) return;
    stop();
    setSelected(opt);
    setRevealed(true);
    if (opt === q.correct) successHaptic(); else errorHaptic();
  };

  const handleNext = () => {
    stop();
    const result = { ...q, chosen: selected, isCorrect: selected === q.correct };
    const next   = [...answers, result];
    if (isLast) { onFinish(next); return; }
    setAnswers(next);
    setQuizIndex(quizIndex + 1);
    setSelected(null);
    setRevealed(false);
  };

  const modeLabel = mode === 'daily' ? 'DAILY CHALLENGE' : mode === 'weakspots' ? 'WEAK SPOTS' : 'TEST MODE';

  const SpeakerBtn = ({ target, label }) => {
    const active = speakingTarget === target && speaking;
    return (
      <TouchableOpacity
        onPress={() => handleSpeak(target)}
        disabled={!available}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, minHeight: 36, opacity: available ? 1 : 0.4 }}
        activeOpacity={0.7}
        accessibilityLabel={!available ? 'Read aloud unavailable in this language' : active ? 'Stop audio' : label}
      >
        <Animated.View style={active ? { transform: [{ scale: pulseAnim }] } : {}}>
          <Ionicons
            name={active ? 'volume-high' : 'volume-medium-outline'}
            size={18}
            color={active ? colors.primary : '#ccc'}
          />
        </Animated.View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.primary : '#ccc' }}>
          {!available ? 'Unavailable' : active ? 'Playing…' : label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.quizHeader}>
        <Text style={styles.quizCounter}>Question {quizIndex + 1} of {questions.length}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.quizCat}>{modeLabel} · {q.category.toUpperCase()}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.quizContent}>
        <Text style={[styles.questionText, { marginBottom: 6 }]}>{q.question}</Text>
        <SpeakerBtn target="question" label="Read question" />
        <View style={{ height: 14 }} />

        {LOCATION_QUESTION_IDS.includes(q.id) && (
          <View style={styles.locationPanel}>
            {userState ? (
              <>
                <Text style={styles.locationBadge}>For {STATE_DATA[userState]?.name ?? userState}</Text>
                {q.id === 23 ? (
                  <>
                    <Text style={styles.locationAnswer}>Your House representative depends on your congressional district.</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://www.house.gov/representatives/find-your-representative')} activeOpacity={0.7}>
                      <Text style={[styles.locationDisclaimer, { color: '#3B82F6' }]}>Find your rep at house.gov →</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.locationAnswer}>{getPersonalizedAnswer(q.id, userState)}</Text>
                    <Text style={styles.locationDisclaimer}>Verify before your interview at uscis.gov</Text>
                  </>
                )}
              </>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
                <Text style={styles.locationPromptTxt}>Add your ZIP code in Settings to see your personalized answer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {q.options.map((opt) => {
          let btnStyle = styles.optionBtn;
          let txtStyle = styles.optionText;
          if (revealed) {
            if (opt === q.correct) { btnStyle = [styles.optionBtn, styles.optionCorrect]; txtStyle = [styles.optionText, styles.optionTextWhite]; }
            else if (opt === selected) { btnStyle = [styles.optionBtn, styles.optionWrong]; txtStyle = [styles.optionText, styles.optionTextWhite]; }
            else { btnStyle = [styles.optionBtn, styles.optionDimmed]; }
          } else if (opt === selected) {
            btnStyle = [styles.optionBtn, styles.optionSelected];
          }
          return (
            <TouchableOpacity key={opt} style={btnStyle} onPress={() => handleSelect(opt)} activeOpacity={0.8}>
              <Text style={txtStyle}>{opt}</Text>
              {revealed && opt === q.correct && <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />}
              {revealed && opt === selected && opt !== q.correct && <Ionicons name="close-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          );
        })}

        {revealed && selected !== q.correct && (
          <View style={styles.diffBox}>
            <Text style={styles.diffLabel}>WHY THIS WAS WRONG</Text>
            <View style={styles.diffRow}>
              <Text style={styles.diffWrong}>{selected}</Text>
              <Ionicons name="arrow-forward" size={14} color="#7F8C8D" />
              <Text style={styles.diffCorrect}>{q.correct}</Text>
            </View>
          </View>
        )}

        {revealed && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>{selected === q.correct ? 'EXPLANATION' : 'THE RULE'}</Text>
            <Text style={styles.explanationText}>{q.explanation}</Text>
            <SpeakerBtn target="answer" label="Read answer" />
          </View>
        )}
      </ScrollView>

      {revealed && (
        <View style={styles.quizFooter}>
          <View style={[styles.feedbackBadge, selected === q.correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Ionicons name={selected === q.correct ? 'checkmark-circle' : 'close-circle'} size={18} color="#fff" />
            <Text style={styles.feedbackText}>{selected === q.correct ? 'Correct!' : 'Incorrect'}</Text>
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>{isLast ? 'See Results' : 'Next Question'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── EnhancedResultsView ───────────────────────────────────────────────────────

function EnhancedResultsView({ answers, mode, passThreshold, onRetry, onHome, styles, colors }) {
  const correct = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;
  const passed = correct >= passThreshold;
  const pct = Math.round((correct / total) * 100);
  const wrong = answers.filter((a) => !a.isCorrect);
  const modeLabel = mode === 'daily' ? 'Daily Challenge' : mode === 'weakspots' ? 'Weak Spots' : 'Test Mode';

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={passed ? colors.gradient : ['#c62828', '#e53935']}
        style={styles.resultHeader}
      >
        <Ionicons name={passed ? 'trophy' : 'refresh-circle'} size={52} color="#fff" />
        <Text style={styles.resultTitle}>{modeLabel} · Your Score</Text>
        <Text style={styles.resultScore}>{correct}/{total}</Text>
        <View style={styles.resultPctWrap}>
          <Text style={styles.resultPct}>{pct}%</Text>
        </View>
        <Text style={styles.resultMsg}>{passed ? `You passed! (${passThreshold}/${total} needed)` : `Keep studying — need ${passThreshold}/${total} to pass.`}</Text>
      </LinearGradient>

      {wrong.length > 0 && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewTitle}>Review Incorrect Answers</Text>
          {wrong.map((a, i) => (
            <View key={i} style={styles.reviewCard}>
              <Text style={styles.reviewQuestion}>{a.question}</Text>
              <View style={styles.reviewRow}>
                <Ionicons name="close-circle" size={16} color="#e53935" />
                <Text style={styles.reviewWrong}>{a.chosen}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
                <Text style={styles.reviewCorrect}>{a.correct}</Text>
              </View>
              <Text style={styles.reviewExplanation}>{a.explanation}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.resultActions}>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeBtn} onPress={onHome} activeOpacity={0.85}>
          <Ionicons name="home-outline" size={18} color={colors.primary} />
          <Text style={styles.homeBtnText}>Back to Quiz Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── ModeSelectView ────────────────────────────────────────────────────────────

function ModeSelectView({ allQuestions, categories, wrongCounts, flashProgress, onStartTest, onStartPractice, onChangeVersion, testVersion, quizSize, passThreshold, userState, styles, colors }) {
  const [selectedCat, setSelectedCat] = useState('all');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const weakCount = allQuestions.filter((q) => (wrongCounts[q.id] || 0) > 0).length;
  const knownCount = Object.values(flashProgress).filter((p) => p.status === 'know_it').length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const filteredQuestions = selectedCat === 'all' ? allQuestions : allQuestions.filter((q) => q.category === selectedCat);
  const catLabel = selectedCat === 'all'
    ? 'All Questions'
    : (categories.find((c) => c.key === selectedCat)?.label ?? selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1));

  const toggleCard = (id) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.root} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Hero */}
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.heroBanner}>
          <View style={styles.heroFreeBadge}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.heroFreeBadgeTxt}>FREE · UNLIMITED PRACTICE</Text>
          </View>
          <Text style={styles.heroTitle}>Citizenship Quiz</Text>
        </LinearGradient>

        {/* Test version indicator */}
        {!!testVersion && (
          <TouchableOpacity
            style={{ marginHorizontal: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12 }}
            onPress={onChangeVersion}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={15} color="#666" />
            <Text style={{ flex: 1, fontSize: 12, color: '#555', fontWeight: '600' }}>
              {testVersion === '2008'
                ? 'Taking 2008 test (filed before Oct 20, 2025)'
                : testVersion === '2025'
                ? 'Taking 2025 test (filed on/after Oct 20, 2025)'
                : 'Showing all questions — tap to confirm your test version'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#aaa" />
          </TouchableOpacity>
        )}
        <View style={{ marginHorizontal: 16, marginTop: 6, flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
          <Ionicons name="information-circle-outline" size={12} color="#F9A825" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 10, color: '#aaa', lineHeight: 14 }}>
            Questions based on official USCIS content. Always verify at uscis.gov for the most current information.
          </Text>
        </View>

        {/* Daily Challenge */}
        <View style={styles.dailyCard}>
          <PressableScale onPress={() => onStartTest('daily', 'all')} haptic={false}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.dailyGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.dailyLeft}>
                <Ionicons name="flame" size={28} color="#fff" />
                <View style={styles.dailyInfo}>
                  <Text style={styles.dailyTitle}>Daily Challenge</Text>
                  <Text style={styles.dailySub}>{today} · {quizSize} unique questions</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </PressableScale>
        </View>

        {/* Mode Cards */}
        <View style={styles.modesSection}>
          <Text style={styles.modesSectionTitle}>Choose Mode</Text>
          <View style={styles.modesRow}>
            <TouchableOpacity style={styles.modeCard} onPress={() => onStartPractice(selectedCat)} activeOpacity={0.85}>
              <View style={[styles.modeIconWrap, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="albums" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.modeTitle}>Practice</Text>
              <Text style={styles.modeSub}>Flashcards{'\n'}Know It / Still Learning</Text>
              <Text style={styles.modeCount}>{knownCount} known</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modeCard} onPress={() => onStartTest('test', selectedCat)} activeOpacity={0.85}>
              <View style={[styles.modeIconWrap, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="document-text" size={22} color="#10B981" />
              </View>
              <Text style={styles.modeTitle}>Test Mode</Text>
              <Text style={styles.modeSub}>{quizSize} questions{'\n'}Pass with {passThreshold}/{quizSize}</Text>
              <Text style={[styles.modeCount, { color: '#10B981' }]}>USCIS style</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeCard, weakCount === 0 && { opacity: 0.5 }]}
              onPress={() => weakCount > 0 ? onStartTest('weakspots', 'all') : null}
              activeOpacity={0.85}
            >
              <View style={[styles.modeIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="barbell" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.modeTitle}>Weak Spots</Text>
              <Text style={styles.modeSub}>Questions you{'\n'}got wrong before</Text>
              <Text style={[styles.modeCount, { color: '#8B5CF6' }]}>{weakCount} to review</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category selector for Practice / Test */}
        <View style={styles.catSection}>
          <Text style={styles.catSectionTitle}>Select Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catChip, selectedCat === cat.key && styles.catChipActive]}
                onPress={() => setSelectedCat(cat.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catChipTxt, selectedCat === cat.key && styles.catChipTxtActive]}>
                  {cat.key === 'all'
                    ? `All ${testVersion === '2008' ? cat.count2008 : cat.count2025}`
                    : `${cat.label} (${testVersion === '2008' ? cat.count2008 : cat.count2025})`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Study Guide section header */}
        <View style={styles.catSection}>
          <Text style={styles.catSectionTitle}>Study Guide</Text>
        </View>

        {/* Collapsible question list */}
        {filteredQuestions.map((q) => {
          const isExpanded = expandedCards.has(q.id);
          return (
            <TouchableOpacity
              key={q.id}
              style={styles.guideCard}
              onPress={() => toggleCard(q.id)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <Text style={[styles.guideCardNum, { marginBottom: 0 }]}>QUESTION {q.id} · {q.category.toUpperCase()}</Text>
                {q.testVersion === '2025' && (
                  <View style={{ backgroundColor: '#1565C0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 }}>NEW 2025</Text>
                  </View>
                )}
              </View>
              <Text style={styles.guideCardQ}>{q.question}</Text>
              {isExpanded && (
                <>
                  {LOCATION_QUESTION_IDS.includes(q.id) && userState && q.id !== 23 ? (
                    <>
                      <Text style={styles.locationBadge}>For {STATE_DATA[userState]?.name ?? userState}</Text>
                      <Text style={styles.guideCardAnswer}>{getPersonalizedAnswer(q.id, userState)}</Text>
                    </>
                  ) : (
                    <Text style={styles.guideCardAnswer}>{q.correct}</Text>
                  )}
                  <Text style={styles.guideCardExplanation}>{q.explanation}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sticky Start Quiz CTA */}
      <TouchableOpacity
        style={[styles.catStartBtn, { margin: 16, marginBottom: 16 }]}
        onPress={() => onStartTest('test', selectedCat)}
        activeOpacity={0.85}
      >
        <Ionicons name="play" size={18} color="#fff" />
        <Text style={styles.catStartBtnTxt}>Start {catLabel} Quiz</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── StatsTab ──────────────────────────────────────────────────────────────────

function StatsTab({ stats, styles, colors }) {
  const totalSessions = stats.totalSessions || 0;
  const totalAnswered = stats.totalQuestionsAnswered || 0;
  const totalCorrect = stats.totalCorrect || 0;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const recent = (stats.recentSessions || []).slice(0, 5);

  const modeMap = { practice: 0, test: 0, weakspots: 0, daily: 0 };
  (stats.recentSessions || []).forEach((s) => { if (modeMap[s.mode] !== undefined) modeMap[s.mode]++; });

  return (
    <ScrollView style={styles.statsScroll} contentContainerStyle={styles.statsContent}>
      {/* Stat cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="layers" size={20} color={colors.primary} />
          <Text style={styles.statVal}>{totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={[styles.statVal, { color: accuracy >= 60 ? '#10B981' : '#EF4444' }]}>{accuracy}%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="list" size={20} color="#F59E0B" />
          <Text style={styles.statVal}>{totalAnswered}</Text>
          <Text style={styles.statLabel}>Answered</Text>
        </View>
      </View>

      {/* Mode breakdown */}
      <View style={styles.modeBreakdown}>
        <Text style={styles.modeBreakdownTitle}>Sessions by Mode</Text>
        {[
          { label: 'Practice (Flashcards)', key: 'practice', color: '#3B82F6' },
          { label: 'Test Mode', key: 'test', color: '#10B981' },
          { label: 'Weak Spots', key: 'weakspots', color: '#8B5CF6' },
          { label: 'Daily Challenge', key: 'daily', color: '#F59E0B' },
        ].map((m) => (
          <View key={m.key} style={styles.modeRow}>
            <View style={[styles.modeDot, { backgroundColor: m.color }]} />
            <Text style={styles.modeRowLabel}>{m.label}</Text>
            <Text style={styles.modeRowVal}>{modeMap[m.key] || 0}</Text>
          </View>
        ))}
      </View>

      {/* Recent sessions */}
      {recent.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Sessions</Text>
          {recent.map((s, i) => (
            <View key={i} style={[styles.recentRow, i === recent.length - 1 && { borderBottomWidth: 0 }]}>
              <Ionicons
                name={s.mode === 'practice' ? 'albums' : s.mode === 'weakspots' ? 'barbell' : s.mode === 'daily' ? 'flame' : 'document-text'}
                size={18} color={s.mode === 'practice' ? '#3B82F6' : s.mode === 'weakspots' ? '#8B5CF6' : s.mode === 'daily' ? '#F59E0B' : '#10B981'}
              />
              <Text style={styles.recentMode}>{s.mode === 'practice' ? 'Practice' : s.mode === 'weakspots' ? 'Weak Spots' : s.mode === 'daily' ? 'Daily' : 'Test'}</Text>
              {s.score !== null && s.score !== undefined
                ? <Text style={[styles.recentScore, s.passed ? { color: '#10B981' } : { color: '#EF4444' }]}>{s.score}/{s.total}</Text>
                : <Text style={styles.recentScore}>Practice</Text>}
              <Text style={styles.recentDate}>{new Date(s.date).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

// ── TipsTab ───────────────────────────────────────────────────────────────────

function TipsTab({ tipFavorites, onToggleFav, styles, colors }) {
  const handleShare = async (tip) => {
    try {
      await Share.share({ message: `${tip.title}\n\n${tip.body}\n\n— PathwayUSA Immigration Tips` });
    } catch {}
  };

  return (
    <ScrollView style={styles.tipsScroll} contentContainerStyle={styles.tipsContent} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.tipsHeader}>
        <Text style={styles.tipsHeaderTitle}>Daily Immigration Tips</Text>
        <Text style={styles.tipsHeaderSub}>50 expert tips to guide your journey</Text>
      </LinearGradient>

      {TIPS.map((tip) => {
        const isFav = tipFavorites.has(tip.id);
        return (
          <View key={tip.id} style={[styles.tipCard, isFav && { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
            <View style={[styles.tipIconWrap, { backgroundColor: isFav ? (colors.primaryLight ?? '#e0faf5') : '#f0f4f8' }]}>
              <Ionicons name={tip.icon} size={22} color={isFav ? colors.primary : '#888'} />
            </View>
            <View style={styles.tipRight}>
              <View style={styles.tipCatBadge}>
                <Text style={styles.tipCatTxt}>{tip.category.toUpperCase()}</Text>
              </View>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <GlossaryText style={styles.tipBody}>{tip.body}</GlossaryText>
              <View style={styles.tipActions}>
                <TouchableOpacity style={styles.tipFavBtn} onPress={() => onToggleFav(tip.id)} activeOpacity={0.7} accessibilityLabel={isFav ? 'Remove bookmark' : 'Save tip'}>
                  <Ionicons name={isFav ? 'bookmark' : 'bookmark-outline'} size={22} color={isFav ? colors.primary : '#bbb'} />
                  <Text style={[styles.tipFavBtnTxt, isFav && { color: colors.primary }]}>{isFav ? 'Saved' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tipShareBtn} onPress={() => handleShare(tip)} activeOpacity={0.7} accessibilityLabel="Share tip">
                  <Ionicons name="share-outline" size={22} color="#bbb" />
                  <Text style={styles.tipShareBtnTxt}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── GuideTab ──────────────────────────────────────────────────────────────────

function GuideTab({ allQuestions, categories, testVersion, userState, styles, colors, lang }) {
  const [catFilter, setCatFilter] = useState('all');
  const { speaking, speak, stop, available } = useSpeech(lang);
  const [speakingId, setSpeakingId] = useState(null);

  const filtered = catFilter === 'all' ? allQuestions : allQuestions.filter((q) => q.category === catFilter);

  const handleSpeak = (q) => {
    if (!available) return;
    if (speakingId === q.id) { stop(); setSpeakingId(null); return; }
    stop();
    speak(`Question ${q.id}. ${q.question}. Answer: ${q.correct}. ${q.explanation}`);
    setSpeakingId(q.id);
  };

  useEffect(() => () => stop(), []);

  return (
    <ScrollView style={styles.guideScroll} contentContainerStyle={styles.guideContent} showsVerticalScrollIndicator={false}>
      <View style={styles.guideCatBar}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.catChip, catFilter === cat.key && styles.catChipActive, { marginRight: 8 }]}
            onPress={() => setCatFilter(cat.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.catChipTxt, catFilter === cat.key && styles.catChipTxtActive]}>
              {cat.key === 'all'
                ? `All ${testVersion === '2008' ? cat.count2008 : cat.count2025}`
                : `${cat.label} (${testVersion === '2008' ? cat.count2008 : cat.count2025})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.map((q) => (
        <View key={q.id} style={styles.guideCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <Text style={[styles.guideCardNum, { marginBottom: 0 }]}>QUESTION {q.id} · {q.category.toUpperCase()}</Text>
            {q.testVersion === '2025' && (
              <View style={{ backgroundColor: '#1565C0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 }}>NEW 2025</Text>
              </View>
            )}
          </View>
          <Text style={styles.guideCardQ}>{q.question}</Text>
          {LOCATION_QUESTION_IDS.includes(q.id) && userState && q.id !== 23 ? (
            <>
              <Text style={styles.locationBadge}>For {STATE_DATA[userState]?.name ?? userState}</Text>
              <Text style={styles.guideCardAnswer}>{getPersonalizedAnswer(q.id, userState)}</Text>
            </>
          ) : (
            <Text style={styles.guideCardAnswer}>{q.correct}</Text>
          )}
          <Text style={styles.guideCardExplanation}>{q.explanation}</Text>
          <TouchableOpacity
            style={[styles.guideSpeakBtn, !available && { opacity: 0.4 }]}
            onPress={() => handleSpeak(q)}
            disabled={!available}
            activeOpacity={0.7}
          >
            <Ionicons name={speakingId === q.id ? 'stop-circle-outline' : 'volume-medium-outline'} size={16} color={colors.primary} />
            <Text style={styles.guideSpeakTxt}>{!available ? 'Unavailable' : speakingId === q.id ? 'Stop' : 'Read aloud'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// ── OnboardingModal ───────────────────────────────────────────────────────────

function OnboardingModal({ visible, onClose, styles, colors }) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <DragHandle />
          <Text style={styles.modalTitle}>Welcome to the Quiz!</Text>
          <Text style={styles.modalSub}>Three powerful free modes to help you pass the citizenship test.</Text>

          {[
            { icon: 'albums', color: '#3B82F6', bg: '#DBEAFE', title: 'Practice Mode — Flashcards', desc: 'Flip cards, mark Know It or Still Learning. The app uses spaced repetition to show you harder cards more often.' },
            { icon: 'document-text', color: '#10B981', bg: '#D1FAE5', title: 'Test Mode — USCIS Simulation', desc: '10 random questions, multiple choice. Pass with 6 correct — exactly like the real citizenship interview.' },
            { icon: 'barbell', color: '#8B5CF6', bg: '#EDE9FE', title: 'Weak Spots — Targeted Review', desc: 'Focuses only on questions you have gotten wrong before. The fastest way to improve your score.' },
          ].map((item) => (
            <View key={item.title} style={styles.onboardCard}>
              <View style={[styles.onboardCardIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.onboardCardTitle}>{item.title}</Text>
                <Text style={styles.onboardCardDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={[styles.onboardBtn, { flexDirection: 'row', justifyContent: 'center', gap: 10 }]} onPress={onClose} activeOpacity={0.85}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.onboardBtnTxt}>Start Practicing — It's Free!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main LearningScreen ───────────────────────────────────────────────────────

// ── Daily Done celebration screen (shown when daily quiz limit is reached) ──

function DailyDoneView({ onHome, colors, navigation }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9f9fc', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center', gap: 16 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="star" size={44} color="#FFC107" />
        </View>
        <Text style={{ fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, lineHeight: TYPOGRAPHY.displayLineHeight, color: '#1a1c1e', textAlign: 'center' }}>
          Great work today!
        </Text>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 26, marginHorizontal: 4 }}>
          {"You're one step closer to your citizenship goal. Come back tomorrow to keep the momentum going."}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 36, marginTop: 12 }}
          onPress={onHome}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Back to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Upgrade')}
          activeOpacity={0.75}
          style={{ marginTop: 4 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
            Upgrade for more questions →
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function LearningScreen() {
  const { lang }         = useLanguage();
  const { colors }       = useTheme();
  const { user }         = useAuth();
  const { tier }         = useSubscription();
  const { testVersion, quizSize, passThreshold } = useTestVersion();
  const { stop }         = useSpeech(lang);
  const navigation       = useNavigation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [showTipsModal, setShowTipsModal]   = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [phase, setPhase]             = useState('home');
  const [currentMode, setCurrentMode] = useState(null);
  const [questions, setQuestions]     = useState([]);
  const [answers, setAnswers]         = useState([]);

  const [allQuestions, setAllQuestions] = useState([]);
  const [categories, setCategories]     = useState([]);
  const [dataLoading, setDataLoading]   = useState(false);

  const [wrongCounts, setWrongCounts]     = useState({});
  const [flashProgress, setFlashProgress] = useState({});
  const [stats, setStats]                 = useState({});
  const [tipFavorites, setTipFavorites]   = useState(new Set());
  const [dailyUsed, setDailyUsed]         = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotifPrePrompt, setShowNotifPrePrompt] = useState(false);
  const [showTestVersionModal, setShowTestVersionModal] = useState(false);
  const [userState, setUserState] = useState(null);

  const quizQuestions = useMemo(() => {
    if (testVersion === '2008') return allQuestions.filter((q) => q.testVersion === '2008');
    return allQuestions;
  }, [allQuestions, testVersion]);

  const sessionStartTime = useRef(null);
  const loaded = useRef(false);

  // ── Load data on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    setDataLoading(true);
    import('../data/civicsQuestions').then(({ QUESTIONS, CATEGORIES }) => {
      setAllQuestions(QUESTIONS);
      setCategories(CATEGORIES);
      setDataLoading(false);
      cacheData('quizQuestions', { QUESTIONS, CATEGORIES });
    }).catch(async () => {
      const cached = await getCachedData('quizQuestions');
      if (cached) { setAllQuestions(cached.QUESTIONS); setCategories(cached.CATEGORIES); }
      setDataLoading(false);
    });

    // Load local storage data
    Promise.all([
      AsyncStorage.getItem(KEYS.wrongCounts),
      AsyncStorage.getItem(KEYS.flashProgress),
      AsyncStorage.getItem(KEYS.stats),
      AsyncStorage.getItem(KEYS.tipFavorites),
      AsyncStorage.getItem(KEYS.onboarded),
      AsyncStorage.getItem(DAILY_QUIZ_KEY),
      AsyncStorage.getItem(KEYS.zipCode),
    ]).then(([wc, fp, st, tf, ob, dq, zc]) => {
      try { if (wc) setWrongCounts(JSON.parse(wc)); } catch {}
      try { if (fp) setFlashProgress(JSON.parse(fp)); } catch {}
      try { if (st) setStats(JSON.parse(st)); } catch {}
      try { if (tf) setTipFavorites(new Set(JSON.parse(tf))); } catch {}
      if (!ob) setShowOnboarding(true);
      try { if (zc) setUserState(getStateFromZip(zc)); } catch {}
      try {
        if (dq) {
          const parsed = JSON.parse(dq);
          const today = new Date().toISOString().slice(0, 10);
          if (parsed.date === today) setDailyUsed(parsed.count ?? 0);
        }
      } catch {}

      // Load wrong counts from Supabase to merge
      if (user?.id) {
        loadWrongCountsFromSupabase(user.id).then((remote) => {
          setWrongCounts((local) => {
            const merged = { ...remote };
            for (const [k, v] of Object.entries(local)) {
              merged[k] = Math.max(merged[k] || 0, v);
            }
            AsyncStorage.setItem(KEYS.wrongCounts, JSON.stringify(merged));
            return merged;
          });
        }).catch(() => {});
      }
    });
  }, []);

  // Show test version modal once questions are loaded and no version is chosen
  useEffect(() => {
    if (allQuestions.length > 0 && testVersion === null) {
      setShowTestVersionModal(true);
    }
  }, [allQuestions.length, testVersion]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const dismissOnboarding = async () => {
    setShowOnboarding(false);
    await AsyncStorage.setItem(KEYS.onboarded, '1');
  };

  const saveStats = useCallback(async (newStats) => {
    setStats(newStats);
    await AsyncStorage.setItem(KEYS.stats, JSON.stringify(newStats));
  }, []);

  const saveWrongCounts = useCallback(async (counts) => {
    setWrongCounts(counts);
    await AsyncStorage.setItem(KEYS.wrongCounts, JSON.stringify(counts));
  }, []);

  const saveFlashProgress = useCallback(async (prog) => {
    setFlashProgress(prog);
    await AsyncStorage.setItem(KEYS.flashProgress, JSON.stringify(prog));
    if (user?.id) {
      syncFlashcardProgress(user.id, prog).catch(() => {});
    }
  }, [user]);

  const incrementDailyUsed = useCallback(async (count) => {
    const today = new Date().toISOString().slice(0, 10);
    const next = (dailyUsed || 0) + count;
    setDailyUsed(next);
    await AsyncStorage.setItem(DAILY_QUIZ_KEY, JSON.stringify({ date: today, count: next }));
  }, [dailyUsed]);

  // ── Start quiz modes ───────────────────────────────────────────────────────

  const startTest = useCallback((mode, catKey) => {
    stop();
    let pool = catKey === 'all' ? quizQuestions : quizQuestions.filter((q) => q.category === catKey);
    let qs;
    if (mode === 'daily') {
      qs = getDailyChallenge(quizQuestions, quizSize);
    } else if (mode === 'weakspots') {
      qs = getWeakSpots(quizQuestions, wrongCounts, quizSize);
      if (!qs.length) { Alert.alert('No Weak Spots Yet!', 'Complete some Test Mode quizzes first to identify your weak spots.'); return; }
    } else {
      qs = shuffle(pool).slice(0, quizSize);
    }

    // Enforce daily quiz limit for non-daily modes
    if (mode !== 'daily') {
      const limit = DAILY_QUIZ_LIMIT[tier] ?? DAILY_QUIZ_LIMIT.free;
      const remaining = limit - (dailyUsed || 0);
      if (remaining <= 0) {
        setPhase('dailyDone');
        return;
      }
      // Cap question count to whatever's remaining
      if (qs.length > remaining) qs = qs.slice(0, remaining);
    }

    setQuestions(qs);
    setCurrentMode(mode);
    setAnswers([]);
    sessionStartTime.current = Date.now();
    setPhase(mode === 'daily' ? 'daily' : mode === 'weakspots' ? 'weakspots' : 'test');
  }, [quizQuestions, wrongCounts, stop, tier, dailyUsed, navigation, quizSize]);

  const startPractice = useCallback((catKey) => {
    stop();
    const pool = catKey === 'all' ? quizQuestions : quizQuestions.filter((q) => q.category === catKey);
    setQuestions(shuffle(pool));
    setCurrentMode('practice');
    sessionStartTime.current = Date.now();
    setPhase('practice');
  }, [quizQuestions, stop]);

  // ── Finish handlers ────────────────────────────────────────────────────────

  const handleTestFinish = useCallback(async (ans) => {
    stop();
    setAnswers(ans);

    const correct = ans.filter((a) => a.isCorrect).length;
    const passed = correct >= passThreshold;
    const durationSeconds = Math.round((Date.now() - (sessionStartTime.current || Date.now())) / 1000);

    // Update wrong counts
    const newCounts = { ...wrongCounts };
    ans.forEach((a) => {
      if (!a.isCorrect) {
        newCounts[a.id] = (newCounts[a.id] || 0) + 1;
      }
    });
    await saveWrongCounts(newCounts);

    // Update stats
    const newStats = {
      ...stats,
      totalSessions: (stats.totalSessions || 0) + 1,
      totalQuestionsAnswered: (stats.totalQuestionsAnswered || 0) + ans.length,
      totalCorrect: (stats.totalCorrect || 0) + correct,
      testPasses: (stats.testPasses || 0) + (passed ? 1 : 0),
      perfectScores: (stats.perfectScores || 0) + (correct === quizSize ? 1 : 0),
      weakSpotsSessions: (stats.weakSpotsSessions || 0) + (currentMode === 'weakspots' ? 1 : 0),
      recentSessions: [
        { mode: currentMode, score: correct, total: ans.length, passed, date: new Date().toISOString() },
        ...((stats.recentSessions || []).slice(0, 9)),
      ],
    };
    await saveStats(newStats);
    if (currentMode !== 'daily') await incrementDailyUsed(ans.length);

    // Supabase (background)
    if (user?.id) {
      saveQuizSession(user.id, { mode: currentMode, category: 'all', score: correct, total: ans.length, passed, durationSeconds })
        .then(({ data }) => {
          if (data?.id) saveQuizAnswers(user.id, data.id, ans, currentMode).catch(() => {});
        }).catch(() => {});
    }

    hasAskedNotificationPermission().then((asked) => {
      if (!asked) setShowNotifPrePrompt(true);
    }).catch(() => {});
    setPhase('result');
  }, [wrongCounts, stats, currentMode, user, stop, saveWrongCounts, saveStats, incrementDailyUsed, quizSize, passThreshold]);

  const handlePracticeDone = useCallback(async (knowCount, stillCount, flippedCount) => {
    const newStats = {
      ...stats,
      totalSessions: (stats.totalSessions || 0) + 1,
      totalFlashcardsFlipped: (stats.totalFlashcardsFlipped || 0) + flippedCount,
      totalKnowIt: (stats.totalKnowIt || 0) + knowCount,
      totalStillLearning: (stats.totalStillLearning || 0) + stillCount,
      recentSessions: [
        { mode: 'practice', score: null, total: flippedCount, passed: null, date: new Date().toISOString() },
        ...((stats.recentSessions || []).slice(0, 9)),
      ],
    };
    await saveStats(newStats);

    if (user?.id) {
      saveQuizSession(user.id, { mode: 'practice', category: 'all', score: null, total: flippedCount, passed: null, durationSeconds: 0 }).catch(() => {});
    }

    setPhase('home');
    setShowStatsModal(true);
  }, [stats, user, saveStats]);

  const handleRetry = () => {
    startTest(currentMode, 'all');
  };
  const handleHome = () => { setPhase('home'); };

  const toggleTipFav = useCallback(async (id) => {
    setTipFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      AsyncStorage.setItem(KEYS.tipFavorites, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (dataLoading) {
    return (
      <View style={{ flex: 1, padding: 20, gap: 14, backgroundColor: '#f9f9fc' }}>
        <ShimmerView width={width - 40} style={{ borderRadius: 16, backgroundColor: '#e8e8ea', height: 100 }} />
        <ShimmerView width={width - 40} style={{ borderRadius: 10, backgroundColor: '#e8e8ea', height: 24, width: '50%' }} />
        {[0, 1, 2].map((i) => (
          <ShimmerView key={i} width={width - 40} style={{ borderRadius: 16, backgroundColor: '#e8e8ea', height: 80 }} />
        ))}
      </View>
    );
  }

  // Full-screen quiz phases (no tab bar)
  if (phase === 'practice') {
    return (
      <View style={styles.root}>
        <TouchableOpacity style={styles.backHomeBtn} onPress={handleHome}>
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={styles.backHomeBtnTxt}>Exit Practice</Text>
        </TouchableOpacity>
        <PracticeView
          questions={questions}
          flashProgress={flashProgress}
          onUpdateProgress={saveFlashProgress}
          onDone={handlePracticeDone}
          onBack={handleHome}
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }

  if (phase === 'test' || phase === 'weakspots' || phase === 'daily') {
    return (
      <View style={styles.root}>
        <TouchableOpacity style={styles.backHomeBtn} onPress={handleHome}>
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={styles.backHomeBtnTxt}>Exit Quiz</Text>
        </TouchableOpacity>
        <TestQuizView
          questions={questions}
          onFinish={handleTestFinish}
          mode={currentMode}
          userState={userState}
          navigation={navigation}
          styles={styles}
          colors={colors}
        />
      </View>
    );
  }

  if (phase === 'result') {
    return (
      <EnhancedResultsView
        answers={answers}
        mode={currentMode}
        passThreshold={passThreshold}
        onRetry={handleRetry}
        onHome={handleHome}
        styles={styles}
        colors={colors}
      />
    );
  }

  if (phase === 'dailyDone') {
    return <DailyDoneView onHome={handleHome} colors={colors} navigation={navigation} />;
  }

  // Home view — no internal tab bar (it duplicated the app's own bottom
  // navigation); Tips/Stats/Guide open as modals from small links instead.
  return (
    <View style={styles.root}>
      <View style={{ flex: 1 }}>
        <HelperTip
          tipKey="learn"
          message="This is your learning hub — practice quiz questions, take daily challenges, and build your citizenship knowledge."
          icon="book-outline"
          delay={700}
          accentColor="#1B3A5C"
          pulseGlow
          local
        />
        <View style={styles.studyLinksRow}>
          <TouchableOpacity style={styles.studyLinkBtn} onPress={() => setShowTipsModal(true)} activeOpacity={0.75}>
            <Ionicons name="bulb-outline" size={16} color={colors.primary} />
            <Text style={styles.studyLinkTxt}>Tips</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.studyLinkBtn} onPress={() => setShowStatsModal(true)} activeOpacity={0.75}>
            <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />
            <Text style={styles.studyLinkTxt}>Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.studyLinkBtn} onPress={() => setShowGuideModal(true)} activeOpacity={0.75}>
            <Ionicons name="book-outline" size={16} color={colors.primary} />
            <Text style={styles.studyLinkTxt}>Guide</Text>
          </TouchableOpacity>
        </View>
        <ModeSelectView
          allQuestions={quizQuestions}
          categories={categories}
          wrongCounts={wrongCounts}
          flashProgress={flashProgress}
          onStartTest={startTest}
          onStartPractice={startPractice}
          onChangeVersion={() => setShowTestVersionModal(true)}
          testVersion={testVersion}
          quizSize={quizSize}
          passThreshold={passThreshold}
          userState={userState}
          styles={styles}
          colors={colors}
        />
      </View>

      <Modal visible={showTipsModal} animationType="slide" onRequestClose={() => setShowTipsModal(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTipsModal(false)} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <TipsTab tipFavorites={tipFavorites} onToggleFav={toggleTipFav} styles={styles} colors={colors} />
        </View>
      </Modal>
      <Modal visible={showStatsModal} animationType="slide" onRequestClose={() => setShowStatsModal(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowStatsModal(false)} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <StatsTab stats={stats} styles={styles} colors={colors} />
        </View>
      </Modal>
      <Modal visible={showGuideModal} animationType="slide" onRequestClose={() => setShowGuideModal(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowGuideModal(false)} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <GuideTab allQuestions={allQuestions} categories={categories} testVersion={testVersion} userState={userState} styles={styles} colors={colors} lang={lang} />
        </View>
      </Modal>

      <OnboardingModal visible={showOnboarding} onClose={dismissOnboarding} styles={styles} colors={colors} />

      <TestVersionModal
        visible={showTestVersionModal}
        onDismiss={() => setShowTestVersionModal(false)}
      />

      <NotificationPrePromptModal
        visible={showNotifPrePrompt}
        onSure={async () => {
          setShowNotifPrePrompt(false);
          await markNotificationPermissionAsked();
          const status = await registerForPushNotifications();
          if (status === 'granted') scheduleDailyReminder().catch(() => {});
        }}
        onNotNow={async () => {
          setShowNotifPrePrompt(false);
          await markNotificationPermissionAsked();
        }}
      />
    </View>
  );
}
