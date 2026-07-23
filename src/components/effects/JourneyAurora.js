/**
 * EFFECT 2 – "THE JOURNEY AURORA"
 * Northern-lights waves flow upward behind the roadmap progress circle.
 * Band speed scales with the user's streak.  Completing a milestone triggers
 * a full-intensity burst that then settles back to the ambient flow.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { View, Animated, Easing, StyleSheet, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVisualEffects } from '../../context/VisualEffectsContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexA(hex, alpha) {
  // Append 2-digit hex alpha to a 6-char hex color (e.g. '#1a9e89', 0.4 → '#1a9e8966')
  const a = Math.round(Math.clamp ? Math.clamp(alpha, 0, 1) : Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0');
  return hex + a;
}

// Container size that wraps around the progress circle
const CONTAINER = 130;
const BAND_H    = CONTAINER * 3;   // band is 3× container so it can scroll past fully

const BASE_BANDS = [
  { x: '0%',  w: '45%', phase: 0.00, baseDur: 9000,  colorSet: 0 },
  { x: '22%', w: '55%', phase: 0.28, baseDur: 13000, colorSet: 1 },
  { x: '45%', w: '40%', phase: 0.55, baseDur: 10500, colorSet: 2 },
  { x: '10%', w: '50%', phase: 0.72, baseDur: 7500,  colorSet: 0 },
  { x: '38%', w: '35%', phase: 0.15, baseDur: 15000, colorSet: 1 },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function JourneyAurora({ themeColors, streakCount = 0, milestone = false }) {
  const { enabled } = useVisualEffects();

  const bandAnims = useRef(BASE_BANDS.map((b) => new Animated.Value(b.phase))).current;
  const burstAnim = useRef(new Animated.Value(0)).current;
  const loops     = useRef([]);
  const appRef    = useRef(AppState.currentState);

  // Aurora intensity from 0 (ambient) to 1 (burst)
  const auroraOpacity = burstAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.75, 1.0],
  });

  const speedMultiplier = Math.max(0.35, 1 - streakCount * 0.012);

  const startBands = useCallback(() => {
    if (!enabled) return;
    loops.current = BASE_BANDS.map((band, i) => {
      const dur = band.baseDur * speedMultiplier;
      const loop = Animated.loop(
        Animated.timing(bandAnims[i], {
          toValue:         band.phase + 1,
          duration:        dur,
          easing:          Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return loop;
    });
  }, [enabled, bandAnims, speedMultiplier]);

  const stopBands = useCallback(() => {
    loops.current.forEach((l) => l.stop());
  }, []);

  useEffect(() => {
    startBands();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stopBands();
      else if (appRef.current !== 'active') startBands();
      appRef.current = state;
    });
    return () => { stopBands(); sub.remove(); };
  }, [startBands, stopBands]);

  // Milestone burst: flash to full intensity then settle
  useEffect(() => {
    if (!milestone) return;
    Animated.sequence([
      Animated.timing(burstAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(burstAnim, { toValue: 0, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [milestone, burstAnim]);

  if (!enabled) return null;

  // Build per-band color arrays from theme
  const [c0, c1, c2] = Array.isArray(themeColors) && themeColors.length >= 2
    ? themeColors
    : ['#2A8B7A', '#0F2A3D', '#1F6B5C'];

  const colorSets = [
    ['transparent', hexA(c0, 0.45), hexA(c0, 0.30), 'transparent'],
    ['transparent', hexA(c1, 0.38), hexA(c1, 0.25), 'transparent'],
    ['transparent', hexA(c2, 0.32), hexA(c0, 0.20), 'transparent'],
  ];

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity: auroraOpacity }]}>
      {BASE_BANDS.map((band, i) => {
        const translateY = bandAnims[i].interpolate({
          inputRange:  [band.phase, band.phase + 1],
          outputRange: [CONTAINER, -(BAND_H)],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position:  'absolute',
              left:      band.x,
              width:     band.w,
              height:    BAND_H,
              top:       0,
              transform: [{ translateY }],
            }}
          >
            <LinearGradient
              colors={colorSets[band.colorSet]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});
