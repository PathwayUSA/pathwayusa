import { supabase } from './supabase';

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
const FREEZE_MONTHLY_ALLOWANCE = 2;

export async function checkAndUpdateStreak(userId) {
  const today     = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7); // YYYY-MM

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_opened_date, streak_freezes_remaining, streak_freeze_month')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return { streak: 1, isNew: false, milestone: null, froze: false, broken: false };

  const {
    current_streak = 0,
    longest_streak = 0,
    last_opened_date,
    streak_freezes_remaining = FREEZE_MONTHLY_ALLOWANCE,
    streak_freeze_month,
  } = profile;

  // Already opened today
  if (last_opened_date === today) {
    return { streak: current_streak, isNew: false, milestone: null, froze: false, broken: false };
  }

  // Reset freeze allowance each month
  let freezesLeft = streak_freeze_month === thisMonth ? streak_freezes_remaining : FREEZE_MONTHLY_ALLOWANCE;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const tStr = twoDaysAgo.toISOString().split('T')[0];

  let newStreak = 1;
  let broken    = false;
  let froze     = false;

  if (last_opened_date === yStr) {
    // Consecutive — continue streak
    newStreak = current_streak + 1;
  } else if (last_opened_date === tStr && freezesLeft > 0) {
    // Missed exactly one day → auto-use streak freeze
    newStreak  = current_streak + 1;
    froze      = true;
    freezesLeft = freezesLeft - 1;
  } else {
    // Streak broken
    broken    = current_streak > 0;
    newStreak = 1;
  }

  const newLongest  = Math.max(longest_streak, newStreak);
  const milestone   = STREAK_MILESTONES.includes(newStreak) ? newStreak : null;

  await supabase.from('profiles').update({
    current_streak:           newStreak,
    longest_streak:           newLongest,
    last_opened_date:         today,
    streak_freezes_remaining: freezesLeft,
    streak_freeze_month:      thisMonth,
  }).eq('id', userId);

  return { streak: newStreak, isNew: newStreak > (current_streak || 0), milestone, froze, broken, previousStreak: current_streak };
}

export async function getStreakFreezes(userId) {
  const thisMonth = new Date().toISOString().substring(0, 7);
  const { data } = await supabase
    .from('profiles')
    .select('streak_freezes_remaining, streak_freeze_month')
    .eq('id', userId)
    .maybeSingle();

  if (!data || data.streak_freeze_month !== thisMonth) return FREEZE_MONTHLY_ALLOWANCE;
  return data.streak_freezes_remaining ?? FREEZE_MONTHLY_ALLOWANCE;
}
