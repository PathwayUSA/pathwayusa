import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Expo Go doesn't support scheduled notifications reliably — skip in that env
const IS_EXPO_GO = Constants.appOwnership === 'expo';

const DAILY_REMINDER_ID_KEY   = '@pathwayusa/daily_reminder_id';
const NOTIF_ASKED_KEY         = '@pathwayusa/notification_permission_asked';
const DEADLINE_NOTIF_KEY      = '@pathwayusa/deadline_notif_ids';
const INACTIVITY_NOTIF_KEY    = '@pathwayusa/inactivity_notif_id';
const ELIGIBILITY_NOTIF_KEY   = '@pathwayusa/eligibility_notif_ids';
const WEEKLY_NOTIF_KEY        = '@pathwayusa/weekly_notif_id';

export async function hasAskedNotificationPermission() {
  try {
    return (await AsyncStorage.getItem(NOTIF_ASKED_KEY)) !== null;
  } catch { return false; }
}

export async function markNotificationPermissionAsked() {
  try { await AsyncStorage.setItem(NOTIF_ASKED_KEY, '1'); } catch {}
}

const DAILY_MESSAGES = [
  { title: 'Ready to practice today?', body: 'A few minutes of civics prep keeps you on track. Open PathwayUSA and keep your momentum going.' },
  { title: 'Your citizenship journey continues', body: 'Quick quiz today? Every question you answer brings you closer to passing.' },
  { title: 'Stay on track!', body: 'PathwayUSA is waiting. Take a few minutes to review civics questions and stay sharp.' },
  { title: 'Daily practice builds confidence', body: "Open the app and tackle today's challenge — it only takes a few minutes." },
  { title: 'Keep your momentum going!', body: 'A short study session today goes a long way on your journey.' },
  { title: "You're closer than you think", body: 'Quick check-in: practice a few civics questions and move one step forward today.' },
  { title: 'PathwayUSA daily reminder', body: 'Your roadmap is waiting. Open the app and take your next step toward citizenship.' },
];

export async function registerForPushNotifications() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Daily Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: true,
    });
  }

  return finalStatus;
}

export async function scheduleDailyReminder() {
  if (IS_EXPO_GO) return null;
  try {
    const existingId = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    }

    const msgIndex = Math.floor(Math.random() * DAILY_MESSAGES.length);
    const msg = DAILY_MESSAGES[msgIndex];

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
        channelId: Platform.OS === 'android' ? 'daily-reminder' : undefined,
      },
    });

    await AsyncStorage.setItem(DAILY_REMINDER_ID_KEY, id);
    return id;
  } catch {
    return null;
  }
}

export async function cancelDailyReminder() {
  try {
    const id = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(DAILY_REMINDER_ID_KEY);
    }
  } catch {}
}

// ── Deadline Notifications ────────────────────────────────────────────────────

export async function scheduleDeadlineNotifications(deadline) {
  if (IS_EXPO_GO) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('deadline-reminder', {
        name: 'Deadline Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
      }).catch(() => {});
    }

    // Cancel previously scheduled notifications for this deadline
    const raw = await AsyncStorage.getItem(DEADLINE_NOTIF_KEY).catch(() => null);
    const map = raw ? JSON.parse(raw) : {};
    const existing = map[String(deadline.id)] ?? [];
    for (const id of existing) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    const deadlineMs = new Date(deadline.deadline_date + 'T09:00:00').getTime();
    const now = Date.now();
    const ids = [];

    for (const daysBefore of [30, 7, 1]) {
      const fireMs = deadlineMs - daysBefore * 86400000;
      if (fireMs <= now) continue;

      const label = daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: daysBefore === 1 ? '🚨 Deadline Tomorrow!' : '📅 Upcoming Deadline',
          body: `"${deadline.title}" is due ${label}. Tap to start preparing.`,
          sound: true,
          data: { deadlineId: deadline.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireMs),
          channelId: Platform.OS === 'android' ? 'deadline-reminder' : undefined,
        },
      });
      ids.push(id);
    }

    map[String(deadline.id)] = ids;
    await AsyncStorage.setItem(DEADLINE_NOTIF_KEY, JSON.stringify(map));
  } catch {}
}

export async function cancelDeadlineNotifications(deadlineId) {
  try {
    const raw = await AsyncStorage.getItem(DEADLINE_NOTIF_KEY).catch(() => null);
    if (!raw) return;
    const map = JSON.parse(raw);
    const ids = map[String(deadlineId)] ?? [];
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    delete map[String(deadlineId)];
    await AsyncStorage.setItem(DEADLINE_NOTIF_KEY, JSON.stringify(map));
  } catch {}
}

// ── Inactivity Reminder ───────────────────────────────────────────────────────

export async function scheduleInactivityReminder({ lastActionAt, stepName, userName }) {
  if (IS_EXPO_GO) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const existingId = await AsyncStorage.getItem(INACTIVITY_NOTIF_KEY);
    if (existingId) await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});

    // Fire 14 days after last action, at 10am
    const base = new Date(lastActionAt);
    base.setDate(base.getDate() + 14);
    base.setHours(10, 0, 0, 0);
    if (base.getTime() <= Date.now()) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('inactivity-reminder', {
        name: 'Progress Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
      }).catch(() => {});
    }

    const name = userName ?? 'You';
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏸️ Don't lose your momentum",
        body: `${name}, you haven't made progress in 2 weeks. Your current step is "${stepName}". Tap to continue.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: base,
        channelId: Platform.OS === 'android' ? 'inactivity-reminder' : undefined,
      },
    });
    await AsyncStorage.setItem(INACTIVITY_NOTIF_KEY, id);
  } catch {}
}

export async function cancelInactivityReminder() {
  try {
    const id = await AsyncStorage.getItem(INACTIVITY_NOTIF_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(INACTIVITY_NOTIF_KEY);
    }
  } catch {}
}

// ── Citizenship Eligibility Milestones ────────────────────────────────────────

export async function scheduleEligibilityMilestones({ gcDate, pathYears }) {
  if (IS_EXPO_GO) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const rawIds = await AsyncStorage.getItem(ELIGIBILITY_NOTIF_KEY).catch(() => null);
    if (rawIds) {
      const ids = JSON.parse(rawIds);
      for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    const gcStart = new Date(gcDate + 'T00:00:00');
    const eligible = new Date(gcStart);
    eligible.setFullYear(eligible.getFullYear() + pathYears);
    const eligibleMs = eligible.getTime();
    const now = Date.now();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('eligibility-reminder', {
        name: 'Citizenship Eligibility',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
      }).catch(() => {});
    }

    const milestones = [
      {
        offsetMs: 365 * 86400000,
        title: '🗓️ 1 year to citizenship eligibility',
        body: "You're 1 year away from citizenship eligibility! Keep going.",
      },
      {
        offsetMs: 180 * 86400000,
        title: '6 months to citizenship',
        body: '6 months until you can apply for citizenship. Start preparing now.',
      },
      {
        offsetMs: 30 * 86400000,
        title: '⏰ 30 days to eligibility',
        body: 'You may be eligible to apply for citizenship in 30 days! Tap to see your checklist.',
      },
      {
        offsetMs: 0,
        title: '🎉 You may now be eligible!',
        body: 'You may now be eligible to apply for U.S. Citizenship! Open PathwayUSA to see your next steps.',
      },
    ];

    const ids = [];
    for (const m of milestones) {
      const fireMs = eligibleMs - m.offsetMs;
      if (fireMs <= now) continue;
      const fireDate = new Date(fireMs);
      fireDate.setHours(9, 0, 0, 0);
      if (fireDate.getTime() <= now) continue;
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: m.title, body: m.body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
          channelId: Platform.OS === 'android' ? 'eligibility-reminder' : undefined,
        },
      });
      ids.push(id);
    }

    await AsyncStorage.setItem(ELIGIBILITY_NOTIF_KEY, JSON.stringify(ids));
  } catch {}
}

export async function cancelEligibilityMilestones() {
  try {
    const raw = await AsyncStorage.getItem(ELIGIBILITY_NOTIF_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw);
    for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(ELIGIBILITY_NOTIF_KEY);
  } catch {}
}

// ── Weekly Progress Summary (Pro only) ───────────────────────────────────────

export async function scheduleWeeklySummary({ completedCount, totalSteps, nextDeadlineDays, totalDocsGathered }) {
  if (IS_EXPO_GO) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const existingId = await AsyncStorage.getItem(WEEKLY_NOTIF_KEY);
    if (existingId) await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});

    // Next Sunday at 10am
    const now = new Date();
    const daysUntilSunday = ((7 - now.getDay()) % 7) || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
    nextSunday.setHours(10, 0, 0, 0);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('weekly-summary', {
        name: 'Weekly Summary',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: true,
      }).catch(() => {});
    }

    // Compact single-line body matching spec format
    const parts = [`Steps completed: ${completedCount}`];
    if (totalDocsGathered > 0) parts.push(`Documents gathered: ${totalDocsGathered}`);
    if (nextDeadlineDays != null) parts.push(`Next deadline: ${nextDeadlineDays} days`);
    parts.push('Keep going!');

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your weekly PathwayUSA summary',
        body: parts.join(' · '),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextSunday,
        channelId: Platform.OS === 'android' ? 'weekly-summary' : undefined,
      },
    });
    await AsyncStorage.setItem(WEEKLY_NOTIF_KEY, id);
  } catch {}
}

export async function cancelWeeklySummary() {
  try {
    const id = await AsyncStorage.getItem(WEEKLY_NOTIF_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(WEEKLY_NOTIF_KEY);
    }
  } catch {}
}

// ── Cancel All ────────────────────────────────────────────────────────────────

export async function cancelAllDeadlineNotifications() {
  try {
    const raw = await AsyncStorage.getItem(DEADLINE_NOTIF_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    for (const ids of Object.values(map)) {
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      }
    }
    await AsyncStorage.removeItem(DEADLINE_NOTIF_KEY);
  } catch {}
}

export async function cancelAllUserNotifications() {
  await Promise.all([
    cancelDailyReminder(),
    cancelInactivityReminder(),
    cancelEligibilityMilestones(),
    cancelWeeklySummary(),
    cancelAllDeadlineNotifications(),
  ]);
}

// ── Master Scheduler — call on every app open ─────────────────────────────────
// Supabase SQL required:
//   ALTER TABLE profiles
//     ADD COLUMN IF NOT EXISTS last_step_action_at TIMESTAMPTZ,
//     ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE,
//     ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';

export async function scheduleAllUserNotifications({
  profile,
  currentStep,
  completedCount,
  totalSteps,
  nextDeadline,
  allDeadlines,
  totalDocsGathered,
  isPro,
  notifPrefs,
}) {
  if (IS_EXPO_GO) return;
  // Respect the user's master DB preference
  if (profile?.notifications_enabled === false) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const prefs = notifPrefs ?? {};

  // 1. Deadline alerts — re-schedule every upcoming deadline from real user_deadlines data
  if (prefs.deadline_alerts !== false) {
    for (const deadline of (allDeadlines ?? [])) {
      await scheduleDeadlineNotifications(deadline);
    }
  } else {
    await cancelAllDeadlineNotifications();
  }

  // 2. Inactivity reminder — fires 14 days after last_step_action_at if no new completion
  if (prefs.inactivity_reminders !== false && profile?.last_step_action_at && currentStep?.title) {
    await scheduleInactivityReminder({
      lastActionAt: profile.last_step_action_at,
      stepName: currentStep.title,
      userName: profile.full_name?.split(' ')[0],
    });
  } else if (prefs.inactivity_reminders === false) {
    await cancelInactivityReminder();
  }

  // 3. Eligibility milestones — Green Card path only, only if green_card_date is set
  if (prefs.eligibility_milestones !== false && profile?.green_card_date) {
    // Derive path years explicitly from married_to_citizen, then fall back to gc_path_years
    const pathYears = profile.married_to_citizen === true
      ? 3
      : (profile.gc_path_years ?? 5);
    await scheduleEligibilityMilestones({
      gcDate: profile.green_card_date,
      pathYears,
    });
  } else if (prefs.eligibility_milestones === false) {
    await cancelEligibilityMilestones();
  }

  // 4. Weekly summary — Pro users only, using real total doc count across all steps
  if (isPro && prefs.weekly_summary !== false) {
    const nextDeadlineDays = nextDeadline
      ? Math.ceil((new Date(nextDeadline.deadline_date + 'T12:00:00') - new Date()) / 86400000)
      : null;
    await scheduleWeeklySummary({
      completedCount: completedCount ?? 0,
      totalSteps: totalSteps ?? 0,
      nextDeadlineDays,
      totalDocsGathered: totalDocsGathered ?? 0,
    });
  } else if (prefs.weekly_summary === false) {
    await cancelWeeklySummary();
  }
}

// Legacy stubs kept for API compatibility
export async function scheduleStreakReminder()            {}
export async function scheduleMorningMotivation()         {}
export async function scheduleWeeklySummaryNotification() {}
export async function scheduleInactivityNotification()    {}
export async function scheduleMilestoneNotification()     {}
