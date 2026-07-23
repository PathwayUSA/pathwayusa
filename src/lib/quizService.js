import { supabase } from './supabase';

export async function saveQuizSession(userId, { mode, category, score, total, passed, durationSeconds }) {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: userId, mode, category,
      score, total, passed,
      duration_seconds: durationSeconds,
    })
    .select('id')
    .single();
  return { data, error };
}

export async function saveQuizAnswers(userId, sessionId, answers, mode) {
  const rows = answers.map((a) => ({
    session_id: sessionId,
    user_id: userId,
    question_id: a.id,
    is_correct: a.isCorrect,
    chosen: a.chosen ?? null,
    mode,
  }));
  return supabase.from('quiz_answers').insert(rows);
}

export async function syncFlashcardProgress(userId, progress) {
  const rows = Object.entries(progress).map(([qid, p]) => ({
    user_id: userId,
    question_id: parseInt(qid, 10),
    status: p.status,
    know_count: p.knowCount ?? 0,
    still_learning_count: p.stillLearningCount ?? 0,
    next_review: p.nextReview ?? null,
    last_reviewed: new Date().toISOString(),
  }));
  if (!rows.length) return { error: null };
  return supabase
    .from('flashcard_progress')
    .upsert(rows, { onConflict: 'user_id,question_id' });
}

export async function loadWrongCountsFromSupabase(userId) {
  const { data } = await supabase
    .from('quiz_answers')
    .select('question_id, is_correct')
    .eq('user_id', userId)
    .in('mode', ['test', 'daily', 'weakspots']);
  if (!data) return {};
  const counts = {};
  for (const row of data) {
    if (!row.is_correct) {
      counts[row.question_id] = (counts[row.question_id] || 0) + 1;
    }
  }
  return counts;
}
