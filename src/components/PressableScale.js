import React, { useRef, useCallback } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { lightHaptic } from '../utils/haptics';

/**
 * Drop-in replacement for TouchableOpacity that adds a satisfying
 * press-scale animation (like Duolingo / Robinhood buttons).
 *
 * Props: same as TouchableOpacity, plus:
 *   scaleTo  – how small the button shrinks (default 0.96)
 *   haptic   – whether to fire a light impact on press (default true)
 */
export default function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  haptic = true,
  onPress,
  activeOpacity = 0.9,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }, [scale, scaleTo]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    if (haptic) lightHaptic();
    onPress?.();
  }, [haptic, onPress]);

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
