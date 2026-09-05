import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConstellationBackground from '../components/effects/ConstellationBackground';
import { useLanguage, LANGUAGE_OPTIONS } from '../i18n';
import { TYPOGRAPHY } from '../theme';

export default function WelcomeScreen({ navigation }) {
  const insets       = useSafeAreaInsets();
  const { lang, setLang, t } = useLanguage();
  const constellRef  = useRef(null);

  const logoPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.07, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1.00, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [logoPulse]);

  const go = (screen) => {
    constellRef.current?.triggerFlare?.();
    setTimeout(() => navigation.navigate(screen), 180);
  };

  return (
    <View style={styles.container}>
      <ConstellationBackground ref={constellRef} />

      {/* Language selector — top right */}
      <View style={[styles.langBar, { top: insets.top + 12 }]}>
        {LANGUAGE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.code}
            style={[styles.langBtn, lang === opt.code && styles.langBtnActive]}
            onPress={() => setLang(opt.code)}
            activeOpacity={0.75}
          >
            <Text style={[styles.langTxt, lang === opt.code && styles.langTxtActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logo & tagline */}
      <View style={[styles.logoSection, { paddingTop: insets.top + 72 }]}>
        <Animated.View style={[styles.logoRing, { transform: [{ scale: logoPulse }] }]}>
          <View style={styles.logoBg}>
            <Ionicons name="navigate" size={42} color="#1DB89A" />
          </View>
          <View style={styles.logoGlowRing} />
        </Animated.View>
        <Text style={styles.appName}>PathwayUSA</Text>
        <Text style={styles.tagline}>{t('auth_tagline')}</Text>
      </View>

      {/* CTA buttons */}
      <View style={[styles.ctas, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => go('SignUp')} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>{t('auth_get_started')}</Text>
          <Ionicons name="arrow-forward" size={19} color="#1DB89A" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => go('Login')} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>{t('auth_sign_in')}</Text>
        </TouchableOpacity>

        <View style={styles.proLinkWrap}>
          <TouchableOpacity onPress={() => go('AttorneyLogin')} activeOpacity={0.7}>
            <Text style={styles.proLinkTxt}>{t('auth_pro_link')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060618' },

  langBar: {
    position: 'absolute', right: 20, flexDirection: 'row', gap: 6, zIndex: 10,
  },
  langBtn: {
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  langBtnActive: {
    backgroundColor: 'rgba(29,184,154,0.25)', borderColor: '#1DB89A',
  },
  langTxt:       { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  langTxtActive: { color: '#1DB89A' },

  logoSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  logoRing: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
  },
  logoBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  logoGlowRing: {
    position: 'absolute',
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 1, borderColor: 'rgba(29,184,154,0.3)',
    top: -11, left: -11,
  },
  appName: {
    fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize,
    letterSpacing: TYPOGRAPHY.displayLetterSpacing, lineHeight: TYPOGRAPHY.displayLineHeight,
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(29,184,154,0.55)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    fontSize: 17, color: 'rgba(255,255,255,0.78)',
    textAlign: 'center', lineHeight: 26,
  },

  ctas: { paddingHorizontal: 24, gap: 12 },
  primaryBtn: {
    backgroundColor: '#fff',
    paddingVertical: 17, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#1DB89A', shadowRadius: 18, shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  primaryBtnText: { color: '#1DB89A', fontSize: 17, fontWeight: '900' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.32)',
  },
  secondaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  proLinkWrap: { alignItems: 'center', paddingVertical: 8 },
  proLinkTxt: {
    fontSize: 12, color: 'rgba(255,255,255,0.40)',
    textDecorationLine: 'underline',
  },
});
