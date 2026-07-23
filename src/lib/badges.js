export const BADGE_DEFS = [
  { id: 'first_step',    icon: 'footsteps-outline',      name: 'First Step',      desc: 'Complete your first roadmap step',          color: '#2e7d32' },
  { id: 'quiz_master',   icon: 'school-outline',         name: 'Quiz Master',     desc: 'Answer 50 civics questions correctly',      color: '#1565c0' },
  { id: 'streak_7',      icon: 'flame-outline',          name: 'Week Warrior',    desc: 'Maintain a 7-day streak',                   color: '#e65100' },
  { id: 'streak_30',     icon: 'trophy-outline',         name: 'Month Champion',  desc: 'Maintain a 30-day streak',                  color: '#FFB300' },
  { id: 'doc_uploader',  icon: 'document-text-outline',  name: 'Prepared',        desc: 'Upload your first document',                color: '#6a1b9a' },
  { id: 'connected',     icon: 'people-outline',         name: 'Connected',       desc: 'Link with an immigration attorney',         color: '#00838f' },
  { id: 'halfway',       icon: 'map-outline',            name: 'Halfway There',   desc: 'Complete 50% of your roadmap',              color: '#2196f3' },
  { id: 'roadmap_done',  icon: 'checkmark-circle-outline',name: 'Pathfinder',     desc: 'Complete your full roadmap',                color: '#43a047' },
  { id: 'pro_supporter', icon: 'star-outline',           name: 'Pro Supporter',   desc: 'Subscribe to PathwayUSA',                   color: '#0F2A3D' },
  { id: 'daily_10',          icon: 'calendar-outline',       name: 'Daily Devotee',       desc: 'Complete 10 daily challenges',          color: '#f06292' },
  { id: 'community_champion',icon: 'ribbon-outline',         name: 'Community Champion', desc: 'Refer 5 friends to PathwayUSA',          color: '#e91e63' },
];

export async function awardBadge(userId, badgeId, supabase) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('badges')
    .eq('id', userId)
    .maybeSingle();

  const existing = profile?.badges ?? [];
  if (existing.includes(badgeId)) return false;

  await supabase.from('profiles').update({
    badges: [...existing, badgeId],
  }).eq('id', userId);
  return true;
}

export function hasBadge(profileBadges, badgeId) {
  return Array.isArray(profileBadges) && profileBadges.includes(badgeId);
}
