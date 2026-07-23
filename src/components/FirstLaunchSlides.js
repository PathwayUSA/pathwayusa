import React, { useRef, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFirstLaunch } from '../context/FirstLaunchContext';
import { useTheme } from '../context/ThemeContext';

const { width: SW, height: SH } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'home',
    emoji: '🏠',
    title: 'Welcome to Your Daily Hub',
    body: "This is home base. Check your progress, take today's quiz challenge, and pick up right where you left off — every time you open the app.",
    cta: 'Tap to continue →',
  },
  {
    icon: 'school',
    emoji: '🎓',
    title: 'Master the Citizenship Test',
    body: 'Practice all 100 official USCIS civics questions for free. Find your weak spots, focus on what matters, and walk into your interview ready.',
    cta: 'Tap to continue →',
  },
  {
    icon: 'map',
    emoji: '🗺️',
    title: 'Your Personal Roadmap',
    body: "No guessing what's next. We break your journey into clear steps — what to do, what documents you need, and how long each one takes.",
    cta: 'Tap to continue →',
  },
  {
    icon: 'briefcase',
    emoji: '⚖️',
    title: 'Connect With Real Help',
    body: "Find vetted immigration attorneys and legal aid near you, when you're ready for it. You don't have to navigate this alone.",
    cta: 'Get Started →',
  },
];

export default function FirstLaunchSlides() {
  const { shouldShow, isReplay, markDone } = useFirstLaunch();
  const { colors } = useTheme();
  const scrollRef = useRef(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  if (!shouldShow) return null;

  const advance = async () => {
    if (currentIdx < SLIDES.length - 1) {
      const next = currentIdx + 1;
      scrollRef.current?.scrollTo({ x: SW * next, animated: true });
      setCurrentIdx(next);
    } else {
      markDone();
    }
  };

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    if (idx !== currentIdx) setCurrentIdx(idx);
  };

  const isLast = currentIdx === SLIDES.length - 1;

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={[styles.root, { backgroundColor: colors.primary }]}>

        {/* Close button — only shown during replay */}
        {isReplay && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={markDone}
            activeOpacity={0.75}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}

        {/* Slide pager */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onScroll}
          style={styles.pager}
          contentContainerStyle={{ width: SW * SLIDES.length }}
        >
          {SLIDES.map((slide, i) => (
            <View key={i} style={styles.slide}>
              <View style={styles.emojiCircle}>
                <Text style={styles.emoji}>{slide.emoji}</Text>
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIdx
                  ? { backgroundColor: '#fff', width: 24 }
                  : { backgroundColor: 'rgba(255,255,255,0.3)', width: 8 },
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={advance}
          activeOpacity={0.88}
        >
          <Text style={[styles.ctaTxt, { color: colors.primary }]}>
            {SLIDES[currentIdx].cta}
          </Text>
        </TouchableOpacity>

        {/* Bottom padding for home indicator */}
        <View style={styles.bottomPad} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 20,
    right: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  pager: {
    flex: 1,
    width: SW,
  },
  slide: {
    width: SW,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
  },
  emojiCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 20,
  },
  body: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 28,
  },

  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  ctaBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  ctaTxt: {
    fontSize: 18,
    fontWeight: '800',
  },
  bottomPad: {
    height: Platform.OS === 'ios' ? 34 : 16,
  },
});
