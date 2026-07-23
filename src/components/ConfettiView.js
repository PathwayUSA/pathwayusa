import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const DEFAULT_COLORS = ['#FFC107', '#FFD54F', '#FFE082', '#ffffff', '#B2DFDB', '#1a9e89', '#80CBC4', '#FFECB3'];
const DEFAULT_COUNT = 55;

function Particle({ index, delay, colors, count }) {
  const startX = (index / count) * width + (Math.random() - 0.5) * 80;
  const x      = useRef(new Animated.Value(startX)).current;
  const y      = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const color  = colors[index % colors.length];
  const size   = 5 + (index % 5) * 2;
  const dur    = 1800 + (index % 6) * 200;
  const drift  = (index % 2 === 0 ? 1 : -1) * (40 + (index % 4) * 30);
  const isRect = index % 3 === 0;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 500, delay: dur - 600, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: height + 30, duration: dur, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(x, { toValue: startX + drift, duration: dur, useNativeDriver: true }),
      ]),
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rotate, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 500, useNativeDriver: true }),
      ])),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const spin = rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-180deg', '180deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: size,
        height: isRect ? size * 1.6 : size,
        backgroundColor: color,
        borderRadius: isRect ? 2 : size / 2,
        transform: [{ translateX: x }, { translateY: y }, { rotate: spin }],
        opacity,
      }}
    />
  );
}

export default function ConfettiView({ colors = DEFAULT_COLORS, count = DEFAULT_COUNT }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Particle key={i} index={i} delay={i * 25} colors={colors} count={count} />
      ))}
    </View>
  );
}
