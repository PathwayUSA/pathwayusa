import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export default function CircularProgress({
  size        = 120,
  progress    = 0,   // 0 to 1
  color       = '#2BC5B4',
  bgColor     = '#e0e0e0',
  strokeWidth = 12,
  innerColor  = '#fff',
  children,
}) {
  const animProg = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animProg, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const halfSize  = size / 2;
  const innerSize = size - strokeWidth * 2;

  // Left half: inputRange [0, 0.5] → rotation [180deg, 0deg] (reveals colored circle)
  const leftRotate = animProg.interpolate({
    inputRange: [0, 0.5],
    outputRange: ['180deg', '0deg'],
    extrapolate: 'clamp',
  });

  // Right half: inputRange [0.5, 1] → rotation [180deg, 0deg]
  const rightRotate = animProg.interpolate({
    inputRange: [0.5, 1],
    outputRange: ['180deg', '0deg'],
    extrapolate: 'clamp',
  });

  // Right half only shows at >50%
  const rightOpacity = animProg.interpolate({
    inputRange: [0, 0.499, 0.5],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size }}>
      {/* Gray background circle */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: halfSize, backgroundColor: bgColor }} />

      {/* Left half progress (0–50%) */}
      <View style={{ position: 'absolute', width: halfSize, height: size, left: 0, overflow: 'hidden' }}>
        <Animated.View style={{
          width: size, height: size,
          borderRadius: halfSize,
          backgroundColor: color,
          transform: [{ rotate: leftRotate }],
        }} />
      </View>

      {/* Right half progress (50–100%) */}
      <Animated.View style={{
        position: 'absolute', width: halfSize, height: size,
        right: 0, overflow: 'hidden',
        opacity: rightOpacity,
      }}>
        <Animated.View style={{
          position: 'absolute', left: -halfSize, top: 0,
          width: size, height: size,
          borderRadius: halfSize,
          backgroundColor: color,
          transform: [{ rotate: rightRotate }],
        }} />
      </Animated.View>

      {/* Inner white circle — creates donut */}
      <View style={{
        position: 'absolute',
        top: strokeWidth, left: strokeWidth,
        width: innerSize, height: innerSize,
        borderRadius: innerSize / 2,
        backgroundColor: innerColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
}
