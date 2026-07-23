import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, AppState, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const LOCK_TIMEOUT_KEY = '@pathwayusa/lock_timeout';
const DEFAULT_TIMEOUT  = 5 * 60 * 1000; // 5 minutes

export function AppLockOverlay({ children }) {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [locked, setLocked] = useState(false);
  const lastActivityRef     = useRef(Date.now());
  const timerRef            = useRef(null);
  const appStateRef         = useRef(AppState.currentState);
  const fadeAnim            = useRef(new Animated.Value(0)).current;

  const getTimeout = async () => {
    const v = await AsyncStorage.getItem(LOCK_TIMEOUT_KEY);
    return v ? parseInt(v, 10) : DEFAULT_TIMEOUT;
  };

  const lockApp = useCallback(() => {
    if (!user) return;
    setLocked(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [user, fadeAnim]);

  const unlock = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setLocked(false);
    });
    lastActivityRef.current = Date.now();
  }, [fadeAnim]);

  const resetTimer = useCallback(async () => {
    lastActivityRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    const timeout = await getTimeout();
    if (timeout <= 0) return; // 'Never' option
    timerRef.current = setTimeout(lockApp, timeout);
  }, [lockApp]);

  useEffect(() => {
    if (!user) return;
    resetTimer();

    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appStateRef.current === 'active' && nextState !== 'active') {
        // Going to background — check if we should lock immediately
        const timeout = await getTimeout();
        if (timeout <= 0) return;
        if (Date.now() - lastActivityRef.current >= timeout) {
          lockApp();
        }
      }
      if (nextState === 'active' && appStateRef.current !== 'active') {
        // Coming back to foreground
        const timeout = await getTimeout();
        if (timeout > 0 && Date.now() - lastActivityRef.current >= timeout) {
          lockApp();
        } else {
          resetTimer();
        }
      }
      appStateRef.current = nextState;
    });

    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, lockApp, resetTimer]);

  if (!user) return children;

  return (
    <View style={{ flex: 1 }} onTouchStart={resetTimer}>
      {children}
      {locked && (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <View style={[styles.card, { backgroundColor: colors.card || '#fff' }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="lock-closed" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>PathwayUSA Locked</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              Your session was locked after inactivity. Tap to continue.
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={unlock}>
              <Ionicons name="lock-open-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  card:    { width: 300, borderRadius: 24, padding: 28, alignItems: 'center', gap: 14 },
  iconWrap:{ width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 20, fontWeight: '900' },
  sub:     { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
