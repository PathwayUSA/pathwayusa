import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { rowStyles, SectionHeader } from '../../components/SettingsRow';

const LOCK_TIMEOUT_KEY = '@pathwayusa/lock_timeout';

const LOCK_OPTIONS = [
  { label: '1 min',  value: 60000 },
  { label: '5 min',  value: 300000 },
  { label: '15 min', value: 900000 },
  { label: 'Never',  value: 0 },
];

export default function PrivacyAppLockSettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [lockTimeout, setLockTimeoutState] = useState(300000);

  useEffect(() => {
    AsyncStorage.getItem(LOCK_TIMEOUT_KEY).then((v) => {
      if (v != null) setLockTimeoutState(parseInt(v, 10));
    });
  }, []);

  const handleLockTimeout = (val) => {
    setLockTimeoutState(val);
    AsyncStorage.setItem(LOCK_TIMEOUT_KEY, String(val)).catch(() => {});
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={rowStyles.section}>
        <SectionHeader
          icon="lock-closed-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="App Lock" subtitle="Lock the app after inactivity"
        />
        <View style={styles.speedRow}>
          {LOCK_OPTIONS.map((opt) => {
            const sel = lockTimeout === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.speedBtn, sel && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => handleLockTimeout(opt.value)}
              >
                <Text style={[styles.speedLabel, sel && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  speedRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16, gap: 8 },
  speedBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', gap: 4, minHeight: 64 },
  speedLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
});
