import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../theme';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { useTheme } from '../context/ThemeContext';
import { useSpeech } from '../hooks/useSpeech';

const DAY_KEY = '@pathwayusa/appt_prep_day';

// ─── 7-day program data ──────────────────────────────────────────────────────

const PROGRAM = [
  {
    day: 1,
    title: 'Know Your Application',
    icon: 'document-text-outline',
    color: '#1565c0',
    tip: 'Read your entire application from start to finish. Officers will ask you to confirm the information you wrote. Know your dates, addresses, and employer history cold.',
    checklist: [
      'Locate your original application and all receipts (keep copies)',
      'Review every date — entry dates, address changes, travel history',
      'Memorize your employer history for the past 5 years',
      'Confirm all signatures and dates are complete',
    ],
    questions: [
      { q: 'What is your full legal name?', hint: 'State it exactly as it appears on your application.' },
      { q: 'What is your current address? How long have you lived there?', hint: 'Be ready to name prior addresses too.' },
      { q: 'What is your date of birth?', hint: 'This should match your birth certificate exactly.' },
      { q: 'When did you first enter the United States?', hint: 'Give the exact date and port of entry if possible.' },
    ],
  },
  {
    day: 2,
    title: 'Documents & Evidence',
    icon: 'folder-open-outline',
    color: '#2e7d32',
    tip: 'Organize all your supporting documents in the order the officer will review them. Bring originals AND photocopies of everything — never hand over originals without keeping a copy.',
    checklist: [
      'Organize documents in the order listed on your appointment notice',
      'Make two copies of every document (one for officer, one for you)',
      'Prepare a simple index/list of all documents you are bringing',
      'Check that all foreign documents have certified English translations',
      'Verify photo IDs are current and not expired',
    ],
    questions: [
      { q: 'Do you have all required supporting documents with you?', hint: 'Show calm confidence and state "Yes, everything is organized here."' },
      { q: 'Can you explain this document?', hint: 'Practice explaining your tax returns, marriage certificate, or birth certificate in simple English.' },
      { q: 'Were any of your documents issued by a foreign government?', hint: 'Know which documents are foreign and confirm they are translated.' },
    ],
  },
  {
    day: 3,
    title: 'Civics & U.S. History',
    icon: 'flag-outline',
    color: '#7b1fa2',
    tip: 'For naturalization, you must answer 6 of 10 civics questions correctly. Focus on the 100 official USCIS civics questions — especially the ones marked as "likely to be asked."',
    checklist: [
      'Study all 100 USCIS civics questions (find them at uscis.gov)',
      'Practice the quiz in the Learn tab of PathwayUSA daily',
      'Focus on: branches of government, rights & freedoms, U.S. history',
      'Learn your state\'s senators and representative by name',
      'Know the current President, Vice President, and Chief Justice',
    ],
    questions: [
      { q: 'What is the supreme law of the land?', hint: 'The Constitution.' },
      { q: 'How many amendments does the Constitution have?', hint: 'Twenty-seven (27).' },
      { q: 'What are two rights in the First Amendment?', hint: 'Freedom of speech, religion, assembly, press, or petition.' },
      { q: 'Who makes the federal laws?', hint: 'Congress — the Senate and House of Representatives.' },
      { q: 'Who was the first President?', hint: 'George Washington.' },
      { q: 'What is the name of the national anthem?', hint: 'The Star-Spangled Banner.' },
    ],
  },
  {
    day: 4,
    title: 'Personal History',
    icon: 'person-outline',
    color: '#e65100',
    tip: 'Officers will ask detailed personal history questions. Be honest and consistent with your application. If you made an error on your application, consult an attorney before your interview.',
    checklist: [
      'Review your travel history outside the U.S. for the past 5 years',
      'Know the names of employers, supervisors, and dates of employment',
      'Be prepared to explain any gaps in employment or travel',
      'Review any prior immigration applications or visa denials',
      'Know names, birth dates, and immigration status of all family members',
    ],
    questions: [
      { q: 'Have you ever left the United States for more than 6 months?', hint: 'Be specific with dates. Any trip over 6 months can affect your continuous residence.' },
      { q: 'Have you ever been arrested, cited, or detained by law enforcement?', hint: 'Answer honestly. Even minor issues must be disclosed. Bring court records.' },
      { q: 'Have you ever filed federal income taxes as a nonresident?', hint: 'You may need IRS transcripts if tax status was ever a question.' },
      { q: 'Are you currently married? Was your marriage ever terminated?', hint: 'Know divorce dates and locations if applicable. Bring certificates.' },
    ],
  },
  {
    day: 5,
    title: 'English Language Skills',
    icon: 'chatbubble-ellipses-outline',
    color: '#0288d1',
    tip: 'The officer will test your spoken English throughout the interview. Speak clearly, answer in full sentences, and ask for clarification politely if you do not understand a question.',
    checklist: [
      'Practice reading aloud one paragraph of English every morning',
      'Write two sentences in English — practice handwriting if needed',
      'Listen to American news podcasts or TV shows daily',
      'Practice saying "Could you please repeat that?" and "Could you say that more slowly?"',
      'Avoid one-word answers — practice complete sentences',
    ],
    questions: [
      { q: 'Please read this sentence aloud.', hint: 'Read slowly and clearly. Do not rush. The officer wants to hear you, not see you finish quickly.' },
      { q: 'Write this sentence: "I want to be a citizen."', hint: 'Print legibly. You can ask for the sentence to be repeated.' },
      { q: 'Do you understand what that document says?', hint: 'Answer with a full sentence: "Yes, it says I am applying for U.S. citizenship."' },
    ],
  },
  {
    day: 6,
    title: 'Oath & Good Moral Character',
    icon: 'ribbon-outline',
    color: '#558b2f',
    tip: 'You must demonstrate good moral character for the past 5 years. The officer will ask about any behaviors that could disqualify you. Be honest — USCIS verifies everything.',
    checklist: [
      'Review the Oath of Allegiance — know that you are pledging loyalty to the U.S.',
      'Be prepared to explain any criminal record, even minor offenses',
      'Know whether you have ever voted in a U.S. election before being eligible',
      'Confirm you have paid all required taxes and have no outstanding tax issues',
      'Make sure you have NOT claimed to be a U.S. citizen when you were not',
    ],
    questions: [
      { q: 'Have you ever been a member of or associated with any organization, including the Communist Party?', hint: 'Answer accurately. Most people say "No." If yes, explain the context.' },
      { q: 'Do you support the Constitution and form of government of the United States?', hint: '"Yes, I do." Be genuine and confident.' },
      { q: 'Are you willing to take the full Oath of Allegiance to the United States?', hint: '"Yes, I am." Say it clearly.' },
      { q: 'Please read the Oath of Allegiance silently and tell me if you understand it.', hint: 'Read it carefully. It includes renouncing foreign allegiances and bearing arms if required.' },
    ],
  },
  {
    day: 7,
    title: 'Day-of Preparation',
    icon: 'star-outline',
    color: '#c62828',
    tip: 'You have worked hard for this day. Arrive 30 minutes early, dress professionally, stay calm, and be yourself. The officer is not your enemy — they want to complete the interview efficiently.',
    checklist: [
      'Lay out all documents the night before in an organized folder',
      'Confirm the appointment address, time, and which floor / room',
      'Plan your route — how long to get there, where to park or which transit to take',
      'Bring a photo ID and your appointment notice',
      'Dress professionally (business casual or better)',
      'Do NOT bring children or extra people unless required',
      'Turn off your phone before entering the office',
      'Get a good night\'s sleep — rest is as important as studying',
    ],
    questions: [
      { q: 'What if the officer asks something I don\'t understand?', hint: 'Politely say: "I\'m sorry, could you please repeat that?" or "Could you say that more slowly?"' },
      { q: 'What if I make a mistake during the interview?', hint: 'Calmly correct yourself: "I\'m sorry, I misspoke. What I meant to say was…"' },
      { q: 'What happens if I don\'t pass today?', hint: 'You get a second chance. USCIS will schedule a re-interview within 60–90 days. Stay calm — it is not the end.' },
    ],
  },
];

const APPT_TYPES = [
  { key: 'naturalization', label: 'Naturalization (N-400)', color: '#1565c0', icon: 'shield-checkmark-outline' },
  { key: 'greencard',      label: 'Green Card (I-485)',     color: '#2e7d32', icon: 'card-outline'             },
  { key: 'biometrics',     label: 'Biometrics (ASC)',       color: '#7b1fa2', icon: 'finger-print-outline'     },
  { key: 'rfe',            label: 'RFE Response',           color: '#e65100', icon: 'document-outline'         },
];

function QuizModal({ question, onClose, colors }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.quizCard, { backgroundColor: colors.card || '#fff' }]}>
          <Text style={[s.quizQ, { color: colors.text }]}>{question.q}</Text>
          {!revealed ? (
            <TouchableOpacity style={[s.revealBtn, { backgroundColor: colors.primary }]} onPress={() => setRevealed(true)}>
              <Text style={s.revealTxt}>Show Hint</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.hintBox, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              <Text style={[s.hintTxt, { color: colors.primary }]}>{question.hint}</Text>
            </View>
          )}
          <TouchableOpacity style={s.closeQuiz} onPress={onClose}>
            <Text style={[s.closeQuizTxt, { color: colors.textSecondary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function DayCard({ day, isUnlocked, isCompleted, colors, onPress }) {
  const opacity = useRef(new Animated.Value(isUnlocked ? 1 : 0.45)).current;
  return (
    <TouchableOpacity
      onPress={isUnlocked ? onPress : () => Alert.alert('Locked', 'Complete the previous day to unlock this session.')}
      activeOpacity={0.85}
    >
      <Animated.View style={[s.dayCard, { backgroundColor: colors.card || '#fff', opacity }, SHADOWS.small]}>
        <View style={[s.dayIconWrap, { backgroundColor: isCompleted ? '#4caf50' : day.color + '22' }]}>
          <Ionicons name={isCompleted ? 'checkmark-circle' : day.icon} size={26} color={isCompleted ? '#4caf50' : day.color} />
        </View>
        <View style={s.dayInfo}>
          <Text style={[s.dayNum, { color: colors.textSecondary }]}>Day {day.day}</Text>
          <Text style={[s.dayTitle, { color: colors.text }]}>{day.title}</Text>
          <Text style={[s.daySub, { color: colors.textSecondary }]}>
            {day.checklist.length} tasks · {day.questions.length} questions
          </Text>
        </View>
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : isUnlocked ? 'chevron-forward' : 'lock-closed-outline'}
          size={20}
          color={isCompleted ? '#4caf50' : isUnlocked ? '#aaa' : '#ccc'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

function DayDetail({ day, onClose, onComplete, isCompleted, colors }) {
  const insets = useSafeAreaInsets();
  const [activeQ, setActiveQ] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const { speak, speaking, stop } = useSpeech();

  const toggleCheck = (i) => setCheckedItems((p) => ({ ...p, [i]: !p[i] }));
  const allChecked  = day.checklist.every((_, i) => checkedItems[i]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.detailRoot, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        {/* Header */}
        <LinearGradient colors={[day.color, day.color + 'aa']} style={s.detailHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.detailDayNum}>Day {day.day}</Text>
            <Text style={s.detailTitle}>{day.title}</Text>
          </View>
          <TouchableOpacity onPress={() => speaking ? stop() : speak(`Day ${day.day}: ${day.title}. ${day.tip}`)} style={{ padding: 4 }}>
            <Ionicons name={speaking ? 'volume-mute' : 'volume-high-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          {/* Tip */}
          <View style={[s.tipBox, { backgroundColor: day.color + '15', borderColor: day.color + '44' }]}>
            <Ionicons name="bulb-outline" size={20} color={day.color} />
            <Text style={[s.tipTxt, { color: day.color }]}>{day.tip}</Text>
          </View>

          {/* Checklist */}
          <View>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Today's Checklist</Text>
            {day.checklist.map((item, i) => (
              <TouchableOpacity key={i} style={s.checkRow} onPress={() => toggleCheck(i)}>
                <View style={[s.checkbox, { borderColor: checkedItems[i] ? '#4caf50' : '#ccc', backgroundColor: checkedItems[i] ? '#4caf50' : 'transparent' }]}>
                  {checkedItems[i] && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[s.checkTxt, { color: colors.text, textDecorationLine: checkedItems[i] ? 'line-through' : 'none', opacity: checkedItems[i] ? 0.5 : 1 }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Practice questions */}
          <View>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Practice Questions</Text>
            <Text style={[s.sectionSub, { color: colors.textSecondary }]}>Tap to practice — try answering before revealing the hint.</Text>
            {day.questions.map((q, i) => (
              <TouchableOpacity key={i} style={[s.questionRow, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]} onPress={() => setActiveQ(q)}>
                <View style={[s.qNumBadge, { backgroundColor: day.color + '22' }]}>
                  <Text style={[s.qNum, { color: day.color }]}>Q{i + 1}</Text>
                </View>
                <Text style={[s.qTxt, { color: colors.text }]}>{q.q}</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Complete button */}
          {!isCompleted && (
            <TouchableOpacity
              style={[s.completeBtn, { backgroundColor: allChecked ? '#4caf50' : '#ccc' }]}
              onPress={allChecked ? onComplete : () => Alert.alert('Complete the checklist', 'Check off all items before marking this day complete.')}
              disabled={!allChecked}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={s.completeBtnTxt}>Mark Day {day.day} Complete</Text>
            </TouchableOpacity>
          )}
          {isCompleted && (
            <View style={s.completedBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
              <Text style={s.completedBannerTxt}>Day {day.day} completed — great work!</Text>
            </View>
          )}
        </ScrollView>

        {activeQ && <QuizModal question={activeQ} onClose={() => setActiveQ(null)} colors={colors} />}
      </View>
    </Modal>
  );
}

export default function AppointmentPrepScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [completedDays, setCompletedDays] = useState({});
  const [currentDay, setCurrentDay] = useState(null);
  const [apptType, setApptType] = useState('naturalization');

  useEffect(() => {
    AsyncStorage.getItem(DAY_KEY).then((raw) => {
      if (raw) setCompletedDays(JSON.parse(raw));
    });
  }, []);

  const completeDay = useCallback(async (dayNum) => {
    const updated = { ...completedDays, [dayNum]: true };
    setCompletedDays(updated);
    await AsyncStorage.setItem(DAY_KEY, JSON.stringify(updated));
    setCurrentDay(null);
    Alert.alert('Day Complete!', `Great job finishing Day ${dayNum}. Keep it up!`);
  }, [completedDays]);

  const resetProgress = () => {
    Alert.alert('Reset Progress', 'Start the 7-day program over from the beginning?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: async () => { setCompletedDays({}); await AsyncStorage.removeItem(DAY_KEY); },
      },
    ]);
  };

  const completedCount = Object.keys(completedDays).length;
  const selectedAppt   = APPT_TYPES.find((t) => t.key === apptType) ?? APPT_TYPES[0];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={['#e65100', '#bf360c']} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={s.headerTitle}>Appointment Prep Coach</Text>
          <Text style={s.headerSub}>7-day interview preparation program</Text>
        </View>
        {completedCount > 0 && (
          <TouchableOpacity onPress={resetProgress} style={{ padding: 4 }}>
            <Ionicons name="refresh-outline" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
        {/* Appointment type picker */}
        <View>
          <Text style={[s.pickerLabel, { color: colors.textSecondary }]}>Appointment Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {APPT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[s.apptChip, { borderColor: t.color, backgroundColor: apptType === t.key ? t.color : 'transparent' }]}
                onPress={() => setApptType(t.key)}
              >
                <Ionicons name={t.icon} size={16} color={apptType === t.key ? '#fff' : t.color} />
                <Text style={[s.apptChipTxt, { color: apptType === t.key ? '#fff' : t.color }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Progress card */}
        <LinearGradient colors={[selectedAppt.color, selectedAppt.color + 'cc']} style={s.progressCard}>
          <View style={s.progressCardRow}>
            <View>
              <Text style={s.progressCardTitle}>{completedCount} of 7 days complete</Text>
              <Text style={s.progressCardSub}>
                {completedCount === 0 ? 'Start with Day 1 below' :
                 completedCount === 7 ? 'You are fully prepared!' :
                 `Day ${completedCount + 1} is next`}
              </Text>
            </View>
            <View style={s.progressCircle}>
              <Text style={s.progressCircleTxt}>{Math.round((completedCount / 7) * 100)}%</Text>
            </View>
          </View>
          <View style={s.progressBarOuter}>
            <View style={[s.progressBarInner, { width: `${(completedCount / 7) * 100}%` }]} />
          </View>
        </LinearGradient>

        <DisclaimerBanner />

        {/* Day cards */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Your 7-Day Program</Text>
        {PROGRAM.map((day) => {
          const isCompleted = !!completedDays[day.day];
          const prevDone    = day.day === 1 || !!completedDays[day.day - 1];
          return (
            <DayCard
              key={day.day}
              day={day}
              isUnlocked={prevDone || isCompleted}
              isCompleted={isCompleted}
              colors={colors}
              onPress={() => setCurrentDay(day)}
            />
          );
        })}

        {/* Tips banner */}
        <View style={[s.tipsBanner, SHADOWS.small]}>
          <Ionicons name="information-circle-outline" size={20} color="#1565c0" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.tipsBannerTitle}>Pro Tips</Text>
            <Text style={s.tipsBannerTxt}>Study 1 day at a time. Rushing through the program is less effective than spreading it over 7 days. If your appointment is tomorrow, focus on Day 4–7.</Text>
          </View>
        </View>
      </ScrollView>

      {currentDay && (
        <DayDetail
          day={currentDay}
          onClose={() => setCurrentDay(null)}
          onComplete={() => completeDay(currentDay.day)}
          isCompleted={!!completedDays[currentDay.day]}
          colors={colors}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  backBtn:       { padding: 4 },
  headerContent: { flex: 1 },
  headerTitle:   { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  pickerLabel:   { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  apptChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  apptChipTxt:   { fontSize: 13, fontWeight: '700' },

  progressCard:     { borderRadius: 18, padding: 18, gap: 12 },
  progressCardRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressCardTitle:{ fontSize: 18, fontWeight: '900', color: '#fff' },
  progressCardSub:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  progressCircle:   { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  progressCircleTxt:{ fontSize: 16, fontWeight: '900', color: '#fff' },
  progressBarOuter: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  progressBarInner: { height: 6, backgroundColor: '#fff', borderRadius: 3 },

  sectionTitle:  { fontSize: 16, fontWeight: '800' },
  sectionSub:    { fontSize: 13, marginBottom: 10 },

  dayCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 14 },
  dayIconWrap:   { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  dayInfo:       { flex: 1, gap: 2 },
  dayNum:        { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  dayTitle:      { fontSize: 15, fontWeight: '800' },
  daySub:        { fontSize: 12 },

  tipsBanner:    { flexDirection: 'row', gap: 12, backgroundColor: '#e3f2fd', borderRadius: 14, padding: 14, alignItems: 'flex-start' },
  tipsBannerTitle:{ fontSize: 13, fontWeight: '800', color: '#1565c0', marginBottom: 2 },
  tipsBannerTxt: { fontSize: 12, color: '#1565c0', lineHeight: 17 },

  // DayDetail modal
  detailRoot:    { flex: 1 },
  detailHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  detailDayNum:  { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase' },
  detailTitle:   { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 2 },

  tipBox:        { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'flex-start' },
  tipTxt:        { flex: 1, fontSize: 14, lineHeight: 20 },

  checkRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  checkbox:      { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0 },
  checkTxt:      { flex: 1, fontSize: 14, lineHeight: 20 },

  questionRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, marginBottom: 8 },
  qNumBadge:     { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  qNum:          { fontSize: 12, fontWeight: '800' },
  qTxt:          { flex: 1, fontSize: 14, lineHeight: 19 },

  completeBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  completeBtnTxt:{ color: '#fff', fontSize: 16, fontWeight: '800' },
  completedBanner:{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#e8f5e9', borderRadius: 14, padding: 14 },
  completedBannerTxt:{ fontSize: 15, fontWeight: '700', color: '#2e7d32' },

  // Quiz modal
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  quizCard:      { borderRadius: 20, padding: 24, gap: 16 },
  quizQ:         { fontSize: 18, fontWeight: '800', lineHeight: 26 },
  revealBtn:     { alignItems: 'center', borderRadius: 12, paddingVertical: 13 },
  revealTxt:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  hintBox:       { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  hintTxt:       { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  closeQuiz:     { alignItems: 'center', paddingVertical: 10 },
  closeQuizTxt:  { fontSize: 15 },
});
