import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Dimensions, Platform, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const TOUR_KEY = '@pathwayusa/tour_v1_done';
const { width: SW, height: SH } = Dimensions.get('window');
const TAB_BAR_H = Platform.OS === 'ios' ? 84 : 64;
const TAB_W = SW / 5;

// Arrow triangle geometry
const ARROW_HALF = 16;
const ARROW_H    = 18;

const STEPS = [
  {
    type: 'center',
    iconName: 'hand-left-outline',
    title: 'Welcome to PathwayUSA!',
    body: "Let us take 30 seconds to show you where everything is. Your immigration journey starts here.",
  },
  {
    type: 'tab',
    tabIndex: 0,
    icon: 'home',
    title: 'Home — Your Daily Hub',
    body: "Your personalized home screen. Check your progress, take today's quiz challenge, and stay motivated.",
  },
  {
    type: 'tab',
    tabIndex: 1,
    icon: 'school',
    title: 'Learn — Test Prep',
    body: "Practice all 100 official USCIS civics questions. Daily quizzes help you build real confidence for your citizenship interview.",
  },
  {
    type: 'tab',
    tabIndex: 2,
    icon: 'search',
    title: 'Resources — Find Help',
    body: "Search for immigration attorneys, legal aid clinics, and support organizations near you.",
  },
  {
    type: 'tab',
    tabIndex: 3,
    icon: 'map',
    title: 'Guide — Your Roadmap',
    body: "Step-by-step guidance for your Green Card or Citizenship path. Track progress and upload your documents.",
  },
  {
    type: 'tab',
    tabIndex: 4,
    icon: 'briefcase',
    title: 'Legal — Forms & Tools',
    body: "Form field explainers, RFE response guides, appointment prep coaching, and more legal resources.",
  },
  {
    type: 'center',
    iconName: 'rocket-outline',
    title: "You're All Set!",
    body: "PathwayUSA is here whenever you need it. Start with the Guide tab to choose your immigration path — or jump right into today's quiz.",
    isLast: true,
  },
];

const TAB_STEP_COUNT = STEPS.filter((s) => s.type === 'tab').length;

export default function OnboardingTour() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem(TOUR_KEY).then((v) => {
      if (!v) {
        setTimeout(() => {
          setVisible(true);
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }, 900);
      }
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!visible) return;
    pulseAnim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => { loop.stop(); pulseAnim.setValue(1); };
  }, [visible, step]);

  const dismiss = async () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setVisible(false));
    await AsyncStorage.setItem(TOUR_KEY, '1');
  };

  const next = () => {
    if (step >= STEPS.length - 1) { dismiss(); return; }
    setStep((s) => s + 1);
  };

  const back = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (!visible) return null;

  const current  = STEPS[step];
  const isCenter = current.type === 'center';
  const isFirst  = step === 0;
  const isLast   = step === STEPS.length - 1;

  // Which number tab-step are we on (1-based, ignoring center steps)?
  const tabStepNum = !isCenter
    ? STEPS.slice(0, step + 1).filter((s) => s.type === 'tab').length
    : null;

  // Positioning
  const tabCenterX = !isCenter ? TAB_W * (current.tabIndex + 0.5) : 0;
  const tabCenterY = SH - TAB_BAR_H / 2 + (Platform.OS === 'ios' ? 2 : 0);

  const cardWidth = Math.min(SW - 32, 390);
  const cardLeft  = isCenter
    ? (SW - cardWidth) / 2
    : Math.max(12, Math.min(tabCenterX - cardWidth / 2, SW - cardWidth - 12));

  // Arrow sits flush below the card; still points at the tab center regardless of card clamping
  const arrowLeft   = tabCenterX - ARROW_HALF;
  const cardBg      = colors.primary;
  const iconBg      = 'rgba(255,255,255,0.95)';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>

        {/* ── Tab highlight ── */}
        {!isCenter && (
          <>
            {/* Pulse ring */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  left: tabCenterX - 36,
                  top:  tabCenterY - 36,
                  borderColor: '#fff',
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            {/* Solid icon badge on the tab */}
            <View style={[styles.tabBadge, { left: tabCenterX - 22, top: tabCenterY - 22, backgroundColor: '#fff' }]}>
              <Ionicons name={current.icon} size={22} color={colors.primary} />
            </View>
          </>
        )}

        {/* ── Tooltip card ── */}
        <View
          style={[
            styles.card,
            {
              width: cardWidth,
              left: cardLeft,
              backgroundColor: cardBg,
              ...(isCenter
                ? { top: SH / 2 - 200 }
                : { bottom: TAB_BAR_H + ARROW_H + 6 }),
            },
          ]}
        >
          {/* Step counter eyebrow — tab steps only */}
          {!isCenter && (
            <Text style={styles.eyebrow}>
              STEP {tabStepNum} OF {TAB_STEP_COUNT}
            </Text>
          )}

          {/* Icon */}
          {isCenter ? (
            <View style={[styles.centerIconWrap, { backgroundColor: iconBg }]}>
              <Ionicons name={current.iconName} size={38} color={cardBg} />
            </View>
          ) : (
            <View style={[styles.tabIconWrap, { backgroundColor: iconBg }]}>
              <Ionicons name={current.icon} size={26} color={cardBg} />
            </View>
          )}

          {/* Title */}
          <Text style={styles.cardTitle}>{current.title}</Text>

          {/* Body */}
          <Text style={styles.cardBody}>{current.body}</Text>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step
                    ? { backgroundColor: '#fff', width: 22 }
                    : { backgroundColor: 'rgba(255,255,255,0.28)', width: 7 },
                ]}
              />
            ))}
          </View>

          {/* Button row */}
          <View style={styles.btnRow}>
            {/* Left: Skip (hidden on last step) */}
            <View style={styles.btnLeft}>
              {!isLast && (
                <TouchableOpacity onPress={dismiss} style={styles.skipBtn} activeOpacity={0.7}>
                  <Text style={styles.skipTxt}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Right: Back + Next */}
            <View style={styles.btnRight}>
              {!isFirst && (
                <TouchableOpacity onPress={back} style={styles.backBtn} activeOpacity={0.85}>
                  <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.backTxt}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={next} style={[styles.nextBtn, { backgroundColor: '#fff' }]} activeOpacity={0.88}>
                <Text style={[styles.nextTxt, { color: cardBg }]}>
                  {isLast ? 'Get Started!' : 'Next'}
                </Text>
                {!isLast && <Ionicons name="arrow-forward" size={16} color={cardBg} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Arrow nub — points DOWN at the highlighted tab ── */}
        {!isCenter && (
          <View
            style={[
              styles.arrow,
              {
                left:   arrowLeft,
                bottom: TAB_BAR_H + 6,
                borderTopColor: cardBg,
              },
            ]}
          />
        )}

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.74)',
  },

  // Tab highlight
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    opacity: 0.85,
  },
  tabBadge: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
    }),
  },

  // Tooltip card
  card: {
    position: 'absolute',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.38,
        shadowRadius: 28,
      },
      android: { elevation: 22 },
    }),
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 18,
  },

  centerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },
  tabIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 32,
    marginBottom: 12,
  },
  cardBody: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 26,
    marginBottom: 28,
  },

  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
    alignItems: 'center',
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnLeft: {
    flex: 1,
  },
  btnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    minHeight: 46,
  },
  backTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    minHeight: 46,
  },
  nextTxt: {
    fontSize: 16,
    fontWeight: '800',
  },

  // Downward-pointing triangle arrow
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_HALF,
    borderRightWidth: ARROW_HALF,
    borderTopWidth: ARROW_H,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
