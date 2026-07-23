import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export default function PulseHalo({ color = '#2BC5B4', size = 60, children, style }) {
  const pulse   = useRef(new Animated.Value(1)).current;
  const fadeOut = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,   duration: 1000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(fadeOut, { toValue: 0, duration: 1000, useNativeDriver: true }),
          Animated.timing(fadeOut, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: fadeOut,
          transform: [{ scale: pulse }],
        }}
      />
      {children}
    </View>
  );
}
