import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner() {
  const insets   = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 9,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top > 0 ? insets.top + 4 : 10 },
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
      <Text style={styles.text}>You're offline — some features may be limited</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#424242',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    zIndex: 999,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
