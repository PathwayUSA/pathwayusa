import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, Share, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY } from '../theme';

const { width, height } = Dimensions.get('window');
const NUM_CONFETTI = 60;

function randomBetween(a, b) { return a + Math.random() * (b - a); }

function Confetti() {
  const anims = useRef(
    Array.from({ length: NUM_CONFETTI }, () => ({
      x: new Animated.Value(randomBetween(0, width)),
      y: new Animated.Value(-20),
      rot: new Animated.Value(0),
      color: ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#c77dff','#ff9a3c'][Math.floor(Math.random() * 6)],
      size: randomBetween(8, 16),
      delay: randomBetween(0, 2000),
      dur: randomBetween(2500, 4500),
    }))
  ).current;

  useEffect(() => {
    anims.forEach((a) => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.delay(a.delay),
            Animated.timing(a.y, { toValue: height + 20, duration: a.dur, useNativeDriver: true }),
            Animated.timing(a.y, { toValue: -20, duration: 0, useNativeDriver: true }),
          ]),
          Animated.loop(
            Animated.timing(a.rot, { toValue: 1, duration: 800, useNativeDriver: true })
          ),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: a.x,
            width: a.size,
            height: a.size,
            borderRadius: a.size / 4,
            backgroundColor: a.color,
            transform: [
              { translateY: a.y },
              { rotate: a.rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

function FlagWave() {
  const wave = useRef(new Animated.Value(0)).current;
  const STRIPES = ['#B22234','#fff','#B22234','#fff','#B22234','#fff','#B22234','#fff','#B22234','#fff','#B22234','#fff','#B22234'];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const skewX = wave.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });

  return (
    <Animated.View style={[styles.flag, { transform: [{ skewX }] }]}>
      {STRIPES.map((c, i) => (
        <View key={i} style={[styles.stripe, { backgroundColor: c }]} />
      ))}
      <View style={styles.canton}>
        <Text style={styles.stars}>★★★{'\n'}★★★★{'\n'}★★★</Text>
      </View>
    </Animated.View>
  );
}

export default function CelebrationScreen({ route, navigation }) {
  const { name = 'Friend', path = 'citizenship', months = 0, date = new Date().toDateString() } = route?.params || {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showWhatsNext, setShowWhatsNext] = useState(false);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroScale   = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, delay: 300, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const isGreenCard = path === 'green_card';
  const journeyLabel = isGreenCard ? 'Green Card' : 'Citizenship';
  const nextStepTitle = isGreenCard ? 'Your Green Card Journey Continues' : "Welcome to America's Family";

  const handleShare = () => {
    Share.share({
      message: `🇺🇸 I just completed a major milestone on my ${journeyLabel} journey with PathwayUSA! After ${months} months of hard work and dedication, I am one step closer to my American dream. Join me on this journey: pathwayusa.app`,
      title: `PathwayUSA — ${journeyLabel} Journey Complete!`,
    });
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`🇺🇸 I just completed my ${journeyLabel} journey milestone with PathwayUSA! After ${months} months, I'm so proud. Download PathwayUSA: pathwayusa.app`);
    require('react-native').Linking.openURL(`whatsapp://send?text=${msg}`).catch(() => {
      require('react-native').Linking.openURL(`https://wa.me/?text=${msg}`);
    });
  };

  const WHATS_NEXT_GC = [
    { icon: 'card-outline',     title: 'Receive your Green Card', desc: 'Keep it safe — it is your permanent resident identification.' },
    { icon: 'briefcase-outline',title: 'Update your employer',    desc: 'Show your employer your new Green Card for I-9 reverification.' },
    { icon: 'time-outline',     title: 'Begin 5-year clock',      desc: 'Your clock toward naturalization starts now. Track your continuous residence carefully.' },
    { icon: 'shield-outline',   title: 'Renewal in 10 years',     desc: 'Green Cards must be renewed every 10 years. Set a reminder.' },
    { icon: 'school-outline',   title: 'Study for citizenship',   desc: 'Start practicing the 100 civics questions now — the test is easier when you start early.' },
  ];

  const WHATS_NEXT_CIT = [
    { icon: 'document-text-outline', title: 'Apply for a U.S. Passport',   desc: 'File Form DS-11 with your naturalization certificate. Opens 186+ countries.' },
    { icon: 'checkbox-outline',       title: 'Register to Vote',            desc: 'Your voice now counts. Register at vote.gov — it takes 5 minutes.' },
    { icon: 'card-outline',           title: 'Update Social Security',      desc: 'Visit ssa.gov to update your citizenship status on your SSA record.' },
    { icon: 'people-outline',         title: 'Petition for Family',         desc: 'As a citizen you can now petition for immediate relatives with no wait list.' },
    { icon: 'medal-outline',          title: 'Enjoy all your rights',       desc: 'You are an American. Vote, travel freely, and inspire others on this journey.' },
  ];

  const whatsNext = isGreenCard ? WHATS_NEXT_GC : WHATS_NEXT_CIT;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#002868', '#BF0A30']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Confetti />

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Flag */}
        <FlagWave />

        {/* Hero text */}
        <Animated.View style={[styles.heroWrap, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
          <Text style={styles.congrats}>You Did It!</Text>
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroDesc}>
            After {months > 0 ? `${months} months` : 'your journey'} of hard work, dedication, and perseverance — you have completed your {journeyLabel} journey.
          </Text>
          <Text style={styles.heroDate}>{date}</Text>
        </Animated.View>

        {/* Digital certificate */}
        <View style={styles.certificate}>
          <LinearGradient colors={['#f8f3e3', '#fffbf0']} style={styles.certInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.certTitle}>CERTIFICATE OF ACHIEVEMENT</Text>
            <View style={styles.certDivider} />
            <Text style={styles.certBody}>PathwayUSA proudly recognizes</Text>
            <Text style={styles.certName}>{name}</Text>
            <Text style={styles.certBody}>for completing their {journeyLabel} journey</Text>
            <Text style={styles.certDate}>{date}</Text>
            <Text style={styles.certMotivation}>
              Your perseverance and dedication are an inspiration to everyone on this journey.
            </Text>
            <Text style={styles.certSeal}>🇺🇸 PathwayUSA</Text>
          </LinearGradient>
        </View>

        {/* Share buttons */}
        <View style={styles.shareRow}>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#fff' }]} onPress={handleShare} activeOpacity={0.85}>
            <Ionicons name="share-outline" size={20} color="#002868" />
            <Text style={[styles.shareBtnText, { color: '#002868' }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp} activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={[styles.shareBtnText, { color: '#fff' }]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* What's Next */}
        <TouchableOpacity
          style={styles.whatsNextToggle}
          onPress={() => setShowWhatsNext(!showWhatsNext)}
        >
          <Text style={styles.whatsNextTitle}>{nextStepTitle}</Text>
          <Ionicons name={showWhatsNext ? 'chevron-up' : 'chevron-down'} size={18} color="#fff" />
        </TouchableOpacity>

        {showWhatsNext && (
          <View style={styles.nextList}>
            {whatsNext.map((item, i) => (
              <View key={i} style={styles.nextItem}>
                <View style={styles.nextIconWrap}>
                  <Ionicons name={item.icon} size={20} color="#002868" />
                </View>
                <View style={styles.nextBody}>
                  <Text style={styles.nextTitle}>{item.title}</Text>
                  <Text style={styles.nextDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.popToTop?.() || navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Continue My Journey</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { alignItems: 'center', paddingHorizontal: 20, gap: 20 },

  flag:    { width: 200, height: 105, overflow: 'hidden', borderRadius: 4, marginTop: 8 },
  stripe:  { flex: 1 },
  canton:  { position: 'absolute', top: 0, left: 0, width: 86, height: 57, backgroundColor: '#002868', justifyContent: 'center', alignItems: 'center' },
  stars:   { color: '#fff', fontSize: 10, textAlign: 'center', lineHeight: 16 },

  heroWrap:  { alignItems: 'center', gap: 8 },
  congrats:  { fontSize: 13, fontWeight: '800', color: '#FFD700', textTransform: 'uppercase', letterSpacing: 2 },
  heroName:  { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, lineHeight: TYPOGRAPHY.displayLineHeight, color: '#fff', textAlign: 'center' },
  heroDesc:  { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 23, maxWidth: 300 },
  heroDate:  { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  certificate: { width: '100%', borderRadius: 20, overflow: 'hidden', ...{ shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 } },
  certInner:   { padding: 24, alignItems: 'center', gap: 8, borderWidth: 3, borderColor: '#c8a84b', borderRadius: 20 },
  certTitle:   { fontSize: 11, fontWeight: '900', letterSpacing: 2, color: '#8b6914', textAlign: 'center' },
  certDivider: { width: 80, height: 1.5, backgroundColor: '#c8a84b', marginVertical: 4 },
  certBody:    { fontSize: 13, color: '#555', textAlign: 'center' },
  certName:    { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, lineHeight: TYPOGRAPHY.displayLineHeight, color: '#002868', textAlign: 'center' },
  certDate:    { fontSize: 12, color: '#888' },
  certMotivation: { fontSize: 13, color: '#666', textAlign: 'center', fontStyle: 'italic', lineHeight: 20, marginTop: 4 },
  certSeal:    { fontSize: 15, fontWeight: '800', color: '#002868', marginTop: 8 },

  shareRow:      { flexDirection: 'row', gap: 12, width: '100%' },
  shareBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14 },
  shareBtnText:  { fontSize: 15, fontWeight: '700' },

  whatsNextToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16 },
  whatsNextTitle:  { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },

  nextList: { width: '100%', gap: 10 },
  nextItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  nextIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e8f5ff', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  nextBody:  { flex: 1 },
  nextTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 3 },
  nextDesc:  { fontSize: 13, color: '#555', lineHeight: 19 },

  doneBtn:     { backgroundColor: '#FFD700', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 40, marginTop: 8 },
  doneBtnText: { color: '#002868', fontSize: 16, fontWeight: '900' },
});
