import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useHelperTips } from '../context/HelperTipsContext';
import { useTheme } from '../context/ThemeContext';

const GLOW_COLOR = '#FFC107';

// AsyncStorage key format: tooltip_${tipKey}_seen
// e.g. tooltip_home_seen, tooltip_learn_seen, etc.

export default function HelperTip({
  tipKey,
  message,
  icon = 'information-circle-outline',
  delay = 1000,
  accentColor,
  pulseGlow = false,
  style,
}) {
  const { tipsEnabled } = useHelperTips();
  const { colors } = useTheme();

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(-10)).current;
  const scaleAnim   = useRef(new Animated.Value(0.90)).current;
  const glowOpacity = useRef(new Animated.Value(0.25)).current;
  const glowLoop    = useRef(null);

  const [visible, setVisible] = useState(false);

  // Check AsyncStorage on mount — show only if this screen's tooltip hasn't been seen
  useEffect(() => {
    if (!tipsEnabled) return;
    let tid;
    let cancelled = false;

    AsyncStorage.getItem(`tooltip_${tipKey}_seen`).then((val) => {
      if (val || cancelled) return;
      tid = setTimeout(() => {
        if (cancelled) return;
        setVisible(true);
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 14 }),
        ]).start();
      }, delay);
    }).catch(() => {});

    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  // tipsEnabled is the only reactive dep; tipKey and delay are static props
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipsEnabled]);

  // Glow loop — starts when visible, stops on cleanup
  useEffect(() => {
    if (!pulseGlow || !visible) {
      glowLoop.current?.stop();
      glowOpacity.setValue(0.25);
      return;
    }
    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.9,
          duration: 1400,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.25,
          duration: 1400,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    glowLoop.current.start();
    return () => {
      glowLoop.current?.stop();
    };
  }, [visible, pulseGlow]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10, duration: 180, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.90, duration: 180, useNativeDriver: true }),
    ]).start(() => setVisible(false));
    AsyncStorage.setItem(`tooltip_${tipKey}_seen`, '1').catch(() => {});
  };

  if (!visible) return null;

  const bgColor = accentColor ?? colors.primary;

  return (
    <Animated.View
      style={[
        styles.outerWrap,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      {pulseGlow && (
        <Animated.View
          style={[styles.glowRing, { opacity: glowOpacity }]}
          pointerEvents="none"
        />
      )}

      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          onPress={dismiss}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss tip"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  glowRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: GLOW_COLOR,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  iconWrap: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: '#fff',
  },
  closeBtn: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
