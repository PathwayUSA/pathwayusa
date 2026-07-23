import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '../theme';

const MOOD_AVATARS = {
  happy:        'happy-outline',
  encouraging:  'barbell-outline',
  celebrating:  'trophy-outline',
  concerned:    'sad-outline',
  explaining:   'help-circle-outline',
  proud:        'ribbon-outline',
};

export default function AlexCoach({ visible, mood = 'happy', message, onDismiss }) {
  const slideY  = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY,  { toValue: 0,  friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY,  { toValue: 20, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,  duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && !message) return null;

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY: slideY }] }]}>
      <View style={styles.avatarWrap}>
        <Ionicons name={MOOD_AVATARS[mood] ?? 'happy-outline'} size={36} color="#1a1a2e" style={styles.avatar} />
        <View style={styles.namePill}>
          <Text style={styles.name}>Alex</Text>
        </View>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.message}>{message}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} style={styles.dismiss}>
            <Text style={styles.dismissTxt}>Got it ✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, marginVertical: 8 },
  avatarWrap: { alignItems: 'center', gap: 3 },
  avatar:     {},
  namePill:   { backgroundColor: '#1a1a2e', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  name:       { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  bubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    gap: 8,
    ...SHADOWS.small,
  },
  message:    { fontSize: 14, color: '#1a1a2e', lineHeight: 20 },
  dismiss:    { alignSelf: 'flex-end' },
  dismissTxt: { fontSize: 12, color: '#aaa', fontWeight: '600' },
});
