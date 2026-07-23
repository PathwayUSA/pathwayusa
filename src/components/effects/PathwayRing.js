/**
 * EFFECT 1 – "THE PATHWAY RING"
 * Three concentric dot-rings orbiting the primary CTA button at different
 * speeds and directions, creating a constellation halo.  On press the rings
 * shockwave outward and reform.  A golden breathing glow pulses behind the
 * button in sync with the outer ring period.
 */
import React, { useRef, useEffect, useCallback, forwardRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Animated, Easing, AppState, Platform,
} from 'react-native';
import { useVisualEffects } from '../../context/VisualEffectsContext';

// ── Ring definitions ──────────────────────────────────────────────────────────

const RINGS = [
  { r: 76, dots: 16, color: '#FFD700', dur: 8000, dir:  1 },   // outer – gold, CW
  { r: 54, dots: 12, color: '#1a9e89', dur: 5000, dir: -1 },   // middle – teal, CCW
  { r: 34, dots:  8, color: '#ffffff', dur: 3000, dir:  1 },   // inner – white, CW
];

// How far (px) the ring overlay extends beyond the button bounds
const EXTRA = 88;

// Per-dot brightness tiers so each ring looks like a star field
const OPAC = [1.0, 0.38, 0.72, 0.28, 0.88, 0.45, 0.62, 0.32, 0.55, 0.80, 0.22, 0.68, 0.90, 0.42, 0.58, 0.75];

// ── Component ────────────────────────────────────────────────────────────────

function PathwayRing({ buttonStyle, onPress, children }, _ref) {
  const { enabled } = useVisualEffects();

  const rotAnims   = useRef(RINGS.map(() => new Animated.Value(0))).current;
  const shockScale = useRef(RINGS.map(() => new Animated.Value(1))).current;
  const shockOpaq  = useRef(RINGS.map(() => new Animated.Value(1))).current;
  const glowOpaq   = useRef(new Animated.Value(0.10)).current;
  const loops      = useRef([]);
  const glowLoop   = useRef(null);
  const appRef     = useRef(AppState.currentState);

  const startAll = useCallback(() => {
    if (!enabled) return;

    loops.current = RINGS.map((ring, i) => {
      const loop = Animated.loop(
        Animated.timing(rotAnims[i], {
          toValue:         1,
          duration:        ring.dur,
          easing:          Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return loop;
    });

    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpaq, { toValue: 0.26, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowOpaq, { toValue: 0.10, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    glowLoop.current.start();
  }, [enabled, rotAnims, glowOpaq]);

  const stopAll = useCallback(() => {
    loops.current.forEach((l) => l.stop());
    glowLoop.current?.stop();
  }, []);

  useEffect(() => {
    startAll();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stopAll();
      else if (appRef.current !== 'active') startAll();
      appRef.current = state;
    });
    return () => { stopAll(); sub.remove(); };
  }, [startAll, stopAll]);

  const handlePress = useCallback(() => {
    // Shockwave: each ring independently expands then reforms
    Animated.parallel(
      RINGS.map((_, i) =>
        Animated.sequence([
          Animated.parallel([
            Animated.timing(shockScale[i], { toValue: 2.5, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(shockOpaq[i],  { toValue: 0,   duration: 430, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(shockScale[i], { toValue: 1, duration: 0,   useNativeDriver: true }),
            Animated.timing(shockOpaq[i],  { toValue: 1, duration: 650, useNativeDriver: true }),
          ]),
        ])
      )
    ).start();
    onPress?.();
  }, [shockScale, shockOpaq, onPress]);

  if (!enabled) {
    return (
      <TouchableOpacity style={buttonStyle} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }

  const dotSize = Platform.OS === 'android' ? 4 : 5;

  return (
    <View style={styles.wrapper}>
      {/* ── Ring overlay (extends EXTRA px beyond button on all sides) ─────── */}
      <View
        style={[styles.ringLayer, { top: -EXTRA, left: -EXTRA, right: -EXTRA, bottom: -EXTRA }]}
        pointerEvents="none"
      >
        {RINGS.map((ring, ri) => {
          const rotate = rotAnims[ri].interpolate({
            inputRange:  [0, 1],
            outputRange: ['0deg', `${ring.dir * 360}deg`],
          });
          const sz = ring.r * 2 + dotSize + 4;
          return (
            <Animated.View
              key={ri}
              style={{
                position: 'absolute',
                width:  sz,
                height: sz,
                transform: [{ rotate }, { scale: shockScale[ri] }],
                opacity: shockOpaq[ri],
              }}
            >
              {Array.from({ length: ring.dots }, (_, di) => {
                const angle    = (2 * Math.PI * di) / ring.dots;
                const opacity  = OPAC[di % OPAC.length];
                const ds       = di % 5 === 0 ? dotSize + 3 : dotSize;
                const tx       = ring.r * Math.cos(angle);
                const ty       = ring.r * Math.sin(angle);
                return (
                  <View
                    key={di}
                    style={{
                      position:        'absolute',
                      left:            ring.r + dotSize / 2 + tx - ds / 2,
                      top:             ring.r + dotSize / 2 + ty - ds / 2,
                      width:           ds,
                      height:          ds,
                      borderRadius:    ds / 2,
                      backgroundColor: ring.color,
                      opacity,
                      // iOS glow
                      shadowColor:     ring.color,
                      shadowRadius:    di % 5 === 0 ? 7 : 3,
                      shadowOpacity:   0.95,
                      shadowOffset:    { width: 0, height: 0 },
                      // Android elevation
                      elevation:       di % 5 === 0 ? 4 : 1,
                    }}
                  />
                );
              })}
            </Animated.View>
          );
        })}
      </View>

      {/* ── Actual button with breathing glow inside ───────────────────────── */}
      <TouchableOpacity style={buttonStyle} onPress={handlePress} activeOpacity={0.85}>
        {/* Breathing glow: golden warmth that pulses in and out */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: buttonStyle?.borderRadius ?? 14,
              backgroundColor: '#FFD700',
              opacity: glowOpaq,
            },
          ]}
          pointerEvents="none"
        />
        {children}
      </TouchableOpacity>
    </View>
  );
}

export default forwardRef(PathwayRing);

const styles = StyleSheet.create({
  wrapper:   { flex: 1, overflow: 'visible' },
  ringLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
