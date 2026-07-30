import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, LANGUAGE_OPTIONS } from '../../i18n';
import { rowStyles, SectionHeader } from '../../components/SettingsRow';

const SPEED_OPTIONS = [
  { key: 'slow',   label: 'Slow',   note: '70% speed'  },
  { key: 'normal', label: 'Normal', note: 'Default'     },
  { key: 'fast',   label: 'Fast',   note: '140% speed'  },
];

const COMING_SOON_NAMES = { es: 'Spanish', fr: 'French', ht: 'Haitian Creole' };

export default function LanguageVoiceSettingsScreen() {
  const { colors } = useTheme();
  const { profile, updateReadingSpeed } = useAuth();
  const { lang, setLang } = useLanguage();
  const insets = useSafeAreaInsets();

  const currentSpeed = profile?.reading_speed ?? 'normal';
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState(null);

  const handleSpeedSelect = async (key) => {
    if (key === currentSpeed || saving) return;
    setSaving(true);
    await updateReadingSpeed(key);
    setSaving(false);
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1800);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={rowStyles.section}>
        <SectionHeader
          icon="language-outline" iconBg="#e8f5e9" iconColor="#2e7d32"
          title="App Language"
        />
        <View style={styles.langRow}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = lang === opt.code;
            return (
              <TouchableOpacity
                key={opt.code}
                style={[styles.langBtn, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => {
                  if (opt.comingSoon) {
                    Alert.alert(
                      'Coming Soon!',
                      `We're working on full ${COMING_SOON_NAMES[opt.code] ?? opt.full} translations. Some screens may still be in English.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Use Anyway', onPress: () => setLang(opt.code) },
                      ],
                    );
                  } else {
                    setLang(opt.code);
                  }
                }}
              >
                <Text style={[styles.langLabel, active && { color: '#fff' }]}>{opt.full || opt.label}</Text>
                {opt.comingSoon && (
                  <Text style={[styles.langSoon, active && { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }]}>
                    Soon
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={rowStyles.section}>
        <SectionHeader
          icon="volume-high-outline" iconBg={colors.primaryLight} iconColor={colors.primary}
          title="Reading Speed" subtitle="How fast content is read aloud"
        />
        <View style={styles.speedRow}>
          {SPEED_OPTIONS.map((opt) => {
            const sel = currentSpeed === opt.key;
            const saved = savedKey === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.speedBtn, sel && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => handleSpeedSelect(opt.key)}
                disabled={saving}
              >
                {saving && sel ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : saved ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
                <Text style={[styles.speedLabel, sel && { color: '#fff' }]}>{opt.label}</Text>
                <Text style={[styles.speedNote, { color: sel ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>{opt.note}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  langRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16, gap: 8 },
  langBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', gap: 4, minHeight: 64 },
  langLabel: { fontSize: 14, fontWeight: '700', color: '#333', textAlign: 'center' },
  langSoon: { fontSize: 9, fontWeight: '800', color: '#f57c00', backgroundColor: '#FFF3E0', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden' },

  speedRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16, gap: 8 },
  speedBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', gap: 4, minHeight: 64 },
  speedLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  speedNote:  { fontSize: 12 },
});
