import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUESTIONS } from '../data/civicsQuestions';
import { SHADOWS, TYPOGRAPHY } from '../theme';

function getRecoveryQuestions() {
  const dayBase = Math.floor(Date.now() / 86400000);
  const q1 = QUESTIONS[(dayBase * 3)     % QUESTIONS.length];
  const q2 = QUESTIONS[(dayBase * 3 + 1) % QUESTIONS.length];
  const q3 = QUESTIONS[(dayBase * 3 + 2) % QUESTIONS.length];
  return [q1, q2, q3];
}

export default function StreakRecoveryModal({ visible, lostStreak, onRecover, onDismiss }) {
  const [questions]     = useState(() => getRecoveryQuestions());
  const [qIndex, setQIndex]   = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState(null);
  const [phase, setPhase]     = useState('intro'); // 'intro' | 'quiz' | 'result'

  const handleAnswer = (opt) => {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt === questions[qIndex].correct;
    const newCorrect = isCorrect ? correct + 1 : correct;

    setTimeout(() => {
      if (qIndex < 2) {
        setQIndex((i) => i + 1);
        setSelected(null);
        if (isCorrect) setCorrect(newCorrect);
      } else {
        if (isCorrect) setCorrect(newCorrect);
        setPhase('result');
      }
    }, 800);
  };

  const allCorrect = correct === 3 || (correct === 2 && selected === questions[2]?.correct);

  const reset = () => { setQIndex(0); setCorrect(0); setSelected(null); setPhase('intro'); };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {phase === 'intro' && (
            <>
              <View style={styles.iconRow}>
                <Ionicons name="flame" size={44} color="#e65100" />
                <Ionicons name="heart-dislike-outline" size={36} color="#ef4444" />
              </View>
              <Text style={styles.title}>Streak Lost</Text>
              <Text style={styles.sub}>
                Your {lostStreak}-day streak ended. But you can recover it right now!
              </Text>
              <View style={styles.optionBox}>
                <Ionicons name="school-outline" size={24} color="#1565c0" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>Answer 3 Quiz Questions</Text>
                  <Text style={styles.optSub}>Get all 3 correct to recover your streak — free!</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#1565c0' }]} onPress={() => setPhase('quiz')} activeOpacity={0.85}>
                <Text style={styles.btnTxt}>Start Recovery Quiz</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={onDismiss} activeOpacity={0.7}>
                <Text style={styles.skipTxt}>Skip — start fresh at day 1</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === 'quiz' && (
            <>
              <Text style={styles.quizProgress}>Question {qIndex + 1} of 3</Text>
              <Text style={styles.quizQ}>{questions[qIndex].question}</Text>
              {questions[qIndex].options.map((opt) => {
                const isChosen  = selected === opt;
                const isCorrect = opt === questions[qIndex].correct;
                let bg = '#f5f5f5', border = '#e0e0e0', color = '#333';
                if (selected) {
                  if (isCorrect) { bg = '#e8f5e9'; border = '#2e7d32'; color = '#2e7d32'; }
                  else if (isChosen) { bg = '#ffebee'; border = '#f44336'; color = '#f44336'; }
                }
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.quizOpt, { backgroundColor: bg, borderColor: border }]}
                    onPress={() => handleAnswer(opt)}
                    disabled={!!selected}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.quizOptTxt, { color }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {phase === 'result' && (
            <>
              <View style={styles.iconRow}>
                {allCorrect ? (
                  <>
                    <Ionicons name="flame" size={44} color="#e65100" />
                    <Ionicons name="checkmark-circle" size={36} color="#2e7d32" />
                  </>
                ) : (
                  <Ionicons name="sad-outline" size={52} color="#9e9e9e" />
                )}
              </View>
              <Text style={styles.title}>{allCorrect ? 'Streak Recovered!' : 'Not Quite'}</Text>
              <Text style={styles.sub}>
                {allCorrect
                  ? `You got all 3 right! Your streak is back. Keep the momentum going!`
                  : `You needed 3 correct but got ${correct}. Try again or start fresh.`}
              </Text>
              {allCorrect ? (
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#2e7d32', flexDirection: 'row', gap: 8 }]} onPress={() => { reset(); onRecover(); }} activeOpacity={0.85}>
                  <Ionicons name="flame" size={16} color="#fff" />
                  <Text style={styles.btnTxt}>Streak Recovered!</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: '#1565c0' }]} onPress={reset} activeOpacity={0.85}>
                    <Text style={styles.btnTxt}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.skipBtn} onPress={() => { reset(); onDismiss(); }} activeOpacity={0.7}>
                    <Text style={styles.skipTxt}>Start fresh at day 1</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  card:        { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, gap: 14, minHeight: 380 },
  iconRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  title:       { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, lineHeight: TYPOGRAPHY.displayLineHeight, color: '#1a1a2e', textAlign: 'center' },
  sub:         { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 21 },
  optionBox:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#e3f2fd', borderRadius: 14, padding: 14 },
  optTitle:    { fontSize: 14, fontWeight: '700', color: '#1565c0' },
  optSub:      { fontSize: 12, color: '#555', lineHeight: 17, marginTop: 2 },
  btn:         { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnTxt:      { color: '#fff', fontSize: 15, fontWeight: '800' },
  skipBtn:     { alignItems: 'center', paddingVertical: 8 },
  skipTxt:     { fontSize: 13, color: '#aaa' },
  quizProgress:{ fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  quizQ:       { fontSize: 16, fontWeight: '700', color: '#1a1a2e', lineHeight: 24, textAlign: 'center' },
  quizOpt:     { borderWidth: 1.5, borderRadius: 12, padding: 14 },
  quizOptTxt:  { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
