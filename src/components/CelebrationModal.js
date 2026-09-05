import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConfettiView from './ConfettiView';
import { SHADOWS, TYPOGRAPHY } from '../theme';

export default function CelebrationModal({ visible, title, subtitle, iconName, onClose }) {
  const scale   = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.6);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <ConfettiView />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <Ionicons name={iconName || 'trophy-outline'} size={68} color="#1a1a2e" style={styles.icon} />
          <Text style={styles.title}>{title || 'Congratulations!'}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnTxt}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.medium,
  },
  icon:     { marginBottom: 16 },
  title:    { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, lineHeight: TYPOGRAPHY.displayLineHeight, color: '#1a1a2e', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  btn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 36,
    marginTop: 8,
  },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
