/**
 * ATTORNEY EFFECT – "THE COMMAND PULSE"
 * A radar/sonar-style concentric ring animation for the attorney dashboard header.
 * Rings expand and fade on a 3-second interval (teal).
 * When goldTrigger increments, a gold pulse fires immediately to signal new activity.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const TEAL          = '#1DB89A';
const GOLD          = '#FFD700';
const NUM_RINGS     = 4;
const PULSE_MS      = 3000;
const CONTAINER_SZ  = 260;
const RING_DURATION = 2000;
const RING_STAGGER  = 290;

export default function CommandPulse({ goldTrigger = 0, style }) {
  const tealAnims = useRef(
    Array.from({ length: NUM_RINGS }, () => new Animated.Value(0))
  ).current;
  const goldAnims = useRef(
    Array.from({ length: NUM_RINGS }, () => new Animated.Value(0))
  ).current;
  const prevTrigger = useRef(0);

  const fireRings = useCallback((anims) => {
    anims.forEach((anim, i) => {
      anim.setValue(0);
      Animated.sequence([
        Animated.delay(i * RING_STAGGER),
        Animated.timing(anim, {
          toValue:         1,
          duration:        RING_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  // Regular teal pulse every 3 seconds
  useEffect(() => {
    fireRings(tealAnims);
    const timer = setInterval(() => fireRings(tealAnims), PULSE_MS);
    return () => clearInterval(timer);
  }, [tealAnims, fireRings]);

  // Gold pulse when new activity arrives
  useEffect(() => {
    if (goldTrigger > 0 && goldTrigger !== prevTrigger.current) {
      prevTrigger.current = goldTrigger;
      fireRings(goldAnims);
    }
  }, [goldTrigger, goldAnims, fireRings]);

  const renderRings = (anims, color) =>
    anims.map((anim, i) => {
      const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1.95] });
      const opacity = anim.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 0.28, 0] });
      return (
        <Animated.View
          key={`${color}-${i}`}
          style={[styles.ring, { borderColor: color, transform: [{ scale }], opacity }]}
        />
      );
    });

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {renderRings(tealAnims, TEAL)}
      {renderRings(goldAnims, GOLD)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width:           CONTAINER_SZ,
    height:          CONTAINER_SZ,
    alignItems:      'center',
    justifyContent:  'center',
  },
  ring: {
    position:     'absolute',
    width:        CONTAINER_SZ,
    height:       CONTAINER_SZ,
    borderRadius: CONTAINER_SZ / 2,
    borderWidth:  1.5,
  },
});
