// XP reward amounts per action (base, before weekend multiplier)
export const XP_REWARDS = {
  daily_open:       10,
  quiz_correct:     20,
  quiz_incorrect:    5,
  roadmap_step:    100,
  document_upload:  50,
  daily_challenge:  30,
  referral_signup: 500,
  attorney_approve: 75,
  onboarding:      200,
  streak_7:        150,
  streak_30:       500,
};

export const LEVELS = [
  { level: 1, name: 'New Arrival',    iconName: 'leaf-outline',   minXP: 0,    maxXP: 500    },
  { level: 2, name: 'Finding My Way', iconName: 'map-outline',    minXP: 500,  maxXP: 1500   },
  { level: 3, name: 'Building Roots', iconName: 'home-outline',   minXP: 1500, maxXP: 3000   },
  { level: 4, name: 'Rising Star',    iconName: 'star-outline',   minXP: 3000, maxXP: 5000   },
  { level: 5, name: 'Almost There',   iconName: 'flag-outline',   minXP: 5000, maxXP: 8000   },
  { level: 6, name: 'New American',   iconName: 'ribbon-outline', minXP: 8000, maxXP: Infinity },
];

export const LEVEL_COLORS = ['#78909c', '#1565c0', '#2e7d32', '#e65100', '#7B2FF7', '#c62828'];

export function getCurrentLevel(totalXP) {
  const xp = totalXP ?? 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return { ...LEVELS[i], color: LEVEL_COLORS[i] };
  }
  return { ...LEVELS[0], color: LEVEL_COLORS[0] };
}

export function getLevelProgress(totalXP) {
  const level = getCurrentLevel(totalXP);
  if (level.maxXP === Infinity) return 1;
  const range = level.maxXP - level.minXP;
  const earned = (totalXP ?? 0) - level.minXP;
  return Math.min(Math.max(earned / range, 0), 1);
}

export function getXPToNextLevel(totalXP) {
  const level = getCurrentLevel(totalXP);
  if (level.maxXP === Infinity) return 0;
  return level.maxXP - (totalXP ?? 0);
}

export function isDoubleXPWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

export function getXPAmount(action) {
  const base = XP_REWARDS[action] ?? 0;
  return isDoubleXPWeekend() ? base * 2 : base;
}

export async function addXP(userId, action, supabase) {
  const amount = getXPAmount(action);
  if (!amount || !userId) return { amount: 0, newTotal: null, levelUp: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', userId)
    .maybeSingle();

  const prevXP  = profile?.total_xp ?? 0;
  const newXP   = prevXP + amount;

  await supabase.from('profiles').update({ total_xp: newXP }).eq('id', userId);

  const prevLevel = getCurrentLevel(prevXP);
  const newLevel  = getCurrentLevel(newXP);
  const levelUp   = newLevel.level > prevLevel.level ? newLevel : null;

  return { amount, newTotal: newXP, levelUp };
}
