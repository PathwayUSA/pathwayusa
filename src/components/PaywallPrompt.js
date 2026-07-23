import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SHADOWS } from '../theme';

export default function PaywallPrompt({ featureName }) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="star" size={36} color="#F5A623" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Pro Feature</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {featureName
            ? `${featureName} requires PathwayUSA Pro.`
            : 'This feature requires an upgrade.'}
          {'\n\n'}
          Pro unlocks unlimited quiz questions, document review, attorney connection, full roadmap tracking, and more — $6.99/mo.
        </Text>

        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => navigation.navigate('Upgrade')}
          activeOpacity={0.88}
        >
          <Ionicons name="star" size={16} color="#fff" />
          <Text style={styles.upgradeTxt}>Upgrade to Pro · $6.99/mo</Text>
        </TouchableOpacity>

        <Text style={styles.trial}>7-day free trial · Cancel anytime</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:       { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', ...SHADOWS.medium },
  iconWrap:   { width: 72, height: 72, borderRadius: 20, backgroundColor: '#F5A62320', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title:      { fontSize: 22, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  body:       { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 28, marginBottom: 12, backgroundColor: '#F5A623' },
  upgradeTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  trial:      { fontSize: 12, color: '#aaa' },
});
