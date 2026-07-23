/**
 * EFFECT 3 – "THE CONSTELLATION WELCOME"
 * A full-screen star field where constellation lines slowly draw between
 * 18 stars to reveal the Statue of Liberty silhouette.  Two shooting stars
 * cross the screen at staggered intervals.  A slow oscillation makes the
 * constellation feel alive.  A bottom wave sweeps left-to-right like an
 * ocean horizon.  Calling triggerFlare() via ref makes every star briefly
 * flare to full brightness before a navigation transition.
 */
import React, {
  useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle,
} from 'react';
import {
  View, StyleSheet, Animated, Easing, Dimensions, AppState, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVisualEffects } from '../../context/VisualEffectsContext';

const { width: W, height: H } = Dimensions.get('window');

// ── Background star field ─────────────────────────────────────────────────────
// 5 groups of 9 stars each, sharing one twinkle animation per group.
// Positions are seeded deterministically from group+index.

function seedPos(g, i, mod, offset) {
  return (((g * 17 + i * 13 + offset) * 7919) % mod) / mod;
}

const STAR_GROUPS = Array.from({ length: 5 }, (_, g) =>
  Array.from({ length: 9 }, (_, i) => ({
    x:    seedPos(g, i, W * 0.92, 3)  + W * 0.04,
    y:    seedPos(g, i, H * 0.88, 11) + H * 0.04,
    size: 1 + (g * 9 + i) % 3,
  }))
);

const GROUP_TWINKLE = [
  { min: 0.15, max: 0.70, dur: 2200 },
  { min: 0.10, max: 0.55, dur: 3100 },
  { min: 0.20, max: 0.80, dur: 1800 },
  { min: 0.08, max: 0.60, dur: 2700 },
  { min: 0.18, max: 0.75, dur: 2000 },
];

// ── Statue of Liberty constellation ──────────────────────────────────────────
// 18 stars whose connections form her silhouette (normalized 0-1 coords).

const SOL = [
  { x: 0.596, y: 0.070, bright: true  },   // 0  torch flame tip
  { x: 0.578, y: 0.126, bright: false },   // 1  torch shaft
  { x: 0.560, y: 0.188, bright: false },   // 2  wrist / torch base
  { x: 0.463, y: 0.218, bright: false },   // 3  crown left spike
  { x: 0.500, y: 0.160, bright: true  },   // 4  crown center spike
  { x: 0.537, y: 0.218, bright: false },   // 5  crown right spike
  { x: 0.500, y: 0.264, bright: false },   // 6  crown base / forehead
  { x: 0.555, y: 0.296, bright: false },   // 7  right shoulder (arm side)
  { x: 0.500, y: 0.310, bright: true  },   // 8  center chest
  { x: 0.445, y: 0.296, bright: false },   // 9  left shoulder
  { x: 0.500, y: 0.420, bright: false },   // 10 torso center
  { x: 0.447, y: 0.508, bright: false },   // 11 tablet area / left waist
  { x: 0.500, y: 0.530, bright: false },   // 12 center waist
  { x: 0.455, y: 0.625, bright: false },   // 13 lower robe left
  { x: 0.545, y: 0.625, bright: false },   // 14 lower robe right
  { x: 0.440, y: 0.700, bright: false },   // 15 base left
  { x: 0.560, y: 0.700, bright: false },   // 16 base right
  { x: 0.500, y: 0.742, bright: true  },   // 17 pedestal center
].map((s) => ({ ...s, px: s.x * W, py: s.y * H }));

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 7],           // torch arm
  [3, 6], [4, 6], [5, 6], [5, 7],  // crown
  [6, 8],                            // head → neck
  [8, 9], [8, 7],                   // shoulders
  [8, 10], [10, 12],                // body center
  [9, 11], [11, 12], [11, 13],     // left body + tablet
  [7, 14],                           // right body
  [12, 13], [12, 14],               // lower body
  [13, 15], [14, 16],               // robe → base
  [15, 17], [16, 17],               // pedestal
];

// ── Line geometry ─────────────────────────────────────────────────────────────

function lineGeom(s1, s2) {
  const dx = s2.px - s1.px;
  const dy = s2.py - s1.py;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle  = Math.atan2(dy, dx) * (180 / Math.PI);
  const cx     = (s1.px + s2.px) / 2;
  const cy     = (s1.py + s2.py) / 2;
  return { length, angle, cx, cy };
}

// ── Main component ────────────────────────────────────────────────────────────

function ConstellationBackground(_props, ref) {
  const { enabled } = useVisualEffects();

  // Animated values
  const groupAnims   = useRef(Array.from({ length: 5 }, () => new Animated.Value(0.4))).current;
  const lineAnims    = useRef(CONNECTIONS.map(() => new Animated.Value(0))).current;
  const constellPulse = useRef(new Animated.Value(0.6)).current;
  const rotateAnim   = useRef(new Animated.Value(0)).current;
  const burst        = useRef(new Animated.Value(0)).current;
  const waveAnim     = useRef(new Animated.Value(0)).current;
  const shoot0x      = useRef(new Animated.Value(0)).current;
  const shoot0y      = useRef(new Animated.Value(0)).current;
  const shoot0op     = useRef(new Animated.Value(0)).current;
  const shoot1x      = useRef(new Animated.Value(0)).current;
  const shoot1y      = useRef(new Animated.Value(0)).current;
  const shoot1op     = useRef(new Animated.Value(0)).current;

  const loops   = useRef([]);
  const appRef  = useRef(AppState.currentState);
  const shootTimers = useRef([]);

  // ── Star group twinkle ─────────────────────────────────────────────────────

  const startTwinkle = useCallback(() => {
    if (!enabled) return;
    loops.current = GROUP_TWINKLE.map((cfg, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(groupAnims[i], {
            toValue:         cfg.max,
            duration:        cfg.dur,
            easing:          Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(groupAnims[i], {
            toValue:         cfg.min,
            duration:        cfg.dur,
            easing:          Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.current.forEach((l) => l.start());
  }, [enabled, groupAnims]);

  // ── Constellation star pulse ───────────────────────────────────────────────

  const startConstellPulse = useCallback(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(constellPulse, { toValue: 1.0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(constellPulse, { toValue: 0.6, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    loops.current.push(loop);
  }, [enabled, constellPulse]);

  // ── Slow constellation rotation (oscillation) ──────────────────────────────

  const startRotation = useCallback(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue:  1, duration: 18000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: -1, duration: 18000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    loops.current.push(loop);
  }, [enabled, rotateAnim]);

  // ── Draw constellation lines (staggered reveal) ───────────────────────────

  const drawLines = useCallback(() => {
    if (!enabled) return;
    const timeout = setTimeout(() => {
      Animated.stagger(
        160,
        lineAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true,
          })
        )
      ).start();
    }, 1400);
    shootTimers.current.push(timeout);
  }, [enabled, lineAnims]);

  // ── Bottom wave ────────────────────────────────────────────────────────────

  const startWave = useCallback(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true,
      })
    );
    loop.start();
    loops.current.push(loop);
  }, [enabled, waveAnim]);

  // ── Shooting stars ─────────────────────────────────────────────────────────

  const scheduleShooting = useCallback(() => {
    if (!enabled) return;

    function fireShot(xAnim, yAnim, opAnim, fromX, fromY, toX, toY, interval) {
      const tid = setTimeout(() => {
        xAnim.setValue(0); yAnim.setValue(0); opAnim.setValue(0);
        Animated.parallel([
          Animated.timing(xAnim,  { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(yAnim,  { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.timing(opAnim, { toValue: 0, duration: 920, useNativeDriver: true }),
          ]),
        ]).start(() => {
          const nextTid = setTimeout(() => fireShot(xAnim, yAnim, opAnim, fromX, fromY, toX, toY, interval), interval);
          shootTimers.current.push(nextTid);
        });
      }, interval);
      shootTimers.current.push(tid);
    }

    fireShot(shoot0x, shoot0y, shoot0op, -80, H * 0.12, W + 80, H * 0.48, 4800);
    fireShot(shoot1x, shoot1y, shoot1op, W + 80, H * 0.08, -80, H * 0.44, 9200);
  }, [enabled, shoot0x, shoot0y, shoot0op, shoot1x, shoot1y, shoot1op]);

  // ── Flare API (called from WelcomeScreen on button press) ─────────────────

  useImperativeHandle(ref, () => ({
    triggerFlare: () => {
      Animated.sequence([
        Animated.timing(burst, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 0, duration: 540, useNativeDriver: true }),
      ]).start();
    },
  }), [burst]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    startTwinkle();
    startConstellPulse();
    startRotation();
    drawLines();
    startWave();
    scheduleShooting();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && appRef.current !== 'active') {
        loops.current.forEach((l) => l.start());
      } else if (state !== 'active') {
        loops.current.forEach((l) => l.stop());
        shootTimers.current.forEach(clearTimeout);
        shootTimers.current = [];
      }
      appRef.current = state;
    });

    return () => {
      loops.current.forEach((l) => l.stop());
      shootTimers.current.forEach(clearTimeout);
      sub.remove();
    };
  }, [startTwinkle, startConstellPulse, startRotation, drawLines, startWave, scheduleShooting]);

  if (!enabled) return null;

  // ── Derived animated values ───────────────────────────────────────────────

  const constellRotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1], outputRange: ['-1.8deg', '0deg', '1.8deg'],
  });

  // Burst flare applied to burst overlay opacity
  const burstOpacity = burst.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] });

  // Wave translateX: sweeps from -W to W
  const waveX = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [-W, W] });

  // Shooting star 0 (upper left → lower right)
  const s0x = shoot0x.interpolate({ inputRange: [0, 1], outputRange: [-80, W + 80] });
  const s0y = shoot0y.interpolate({ inputRange: [0, 1], outputRange: [H * 0.12, H * 0.48] });

  // Shooting star 1 (upper right → lower left)
  const s1x = shoot1x.interpolate({ inputRange: [0, 1], outputRange: [W + 80, -80] });
  const s1y = shoot1y.interpolate({ inputRange: [0, 1], outputRange: [H * 0.08, H * 0.44] });

  const PERF = Platform.OS === 'android' && W < 380; // reduce rendering on low-end Android

  return (
    <View style={styles.container} pointerEvents="none">

      {/* ── Background star groups ──────────────────────────────────────── */}
      {STAR_GROUPS.slice(0, PERF ? 3 : 5).map((group, gi) => (
        <Animated.View key={gi} style={{ opacity: groupAnims[gi] }}>
          {group.map((star, si) => (
            <View
              key={si}
              style={{
                position:        'absolute',
                left:            star.x,
                top:             star.y,
                width:           star.size,
                height:          star.size,
                borderRadius:    star.size / 2,
                backgroundColor: '#ffffff',
              }}
            />
          ))}
        </Animated.View>
      ))}

      {/* ── Constellation (Statue of Liberty silhouette) ──────────────── */}
      <Animated.View style={[styles.constellLayer, { transform: [{ rotate: constellRotate }] }]}>

        {/* Lines */}
        {CONNECTIONS.map(([i1, i2], li) => {
          const { length, angle, cx, cy } = lineGeom(SOL[i1], SOL[i2]);
          return (
            <Animated.View
              key={li}
              style={{
                position:        'absolute',
                left:            cx - length / 2,
                top:             cy - 0.5,
                width:           length,
                height:          1,
                backgroundColor: '#ffffff',
                opacity:         lineAnims[li].interpolate({ inputRange: [0, 1], outputRange: [0, 0.32] }),
                transform:       [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}

        {/* Stars */}
        {SOL.map((star, si) => {
          const size = star.bright ? 5 : 3;
          return (
            <Animated.View
              key={si}
              style={{
                position:     'absolute',
                left:         star.px - size / 2,
                top:          star.py - size / 2,
                width:        size,
                height:       size,
                borderRadius: size / 2,
                backgroundColor: '#ffffff',
                opacity:      star.bright ? constellPulse : 0.55,
                shadowColor:  '#ffffff',
                shadowRadius: star.bright ? 8 : 4,
                shadowOpacity: 0.9,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          );
        })}
      </Animated.View>

      {/* ── Shooting stars ─────────────────────────────────────────────── */}
      <Animated.View
        style={{
          position: 'absolute', width: 72, height: 1.5,
          backgroundColor: '#fff', borderRadius: 1,
          opacity: shoot0op,
          transform: [{ translateX: s0x }, { translateY: s0y }, { rotate: '22deg' }],
          shadowColor: '#fff', shadowRadius: 4, shadowOpacity: 0.8,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute', width: 56, height: 1.5,
          backgroundColor: '#fff', borderRadius: 1,
          opacity: shoot1op,
          transform: [{ translateX: s1x }, { translateY: s1y }, { rotate: '-18deg' }],
          shadowColor: '#fff', shadowRadius: 4, shadowOpacity: 0.8,
        }}
      />

      {/* ── Bottom ocean wave ──────────────────────────────────────────── */}
      <Animated.View
        style={[styles.wave, { transform: [{ translateX: waveX }] }]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.12)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ── Burst flare overlay ────────────────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff', opacity: burstOpacity }]} />
    </View>
  );
}

export default forwardRef(ConstellationBackground);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#060618',  // deep space navy
  },
  constellLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  wave: {
    position:   'absolute',
    bottom:     H * 0.12,
    left:       -W,           // starts offscreen left (then scrolls right via translateX)
    width:      W * 3,
    height:     30,
  },
});
