import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';

const APP_VERSION = '1.0.0';

const TEAM = [
  { role: 'Mission', icon: 'heart-outline', text: 'PathwayUSA was built by immigrants, for immigrants. Our mission is to make the U.S. immigration and naturalization process transparent, understandable, and accessible to everyone — regardless of language or income.' },
  { role: 'Privacy', icon: 'shield-checkmark-outline', text: 'We take your privacy seriously. We never sell your data. All personal information is encrypted and stored securely. You can delete your account and all associated data at any time.' },
  { role: 'Legal', icon: 'information-circle-outline', text: 'PathwayUSA provides general informational content only. Nothing in this app constitutes legal advice. Immigration law is complex and changes frequently. Always consult a licensed immigration attorney for advice specific to your situation.' },
];

const CONTACT = [
  {
    label: 'Support Email',
    icon: 'mail-outline',
    action: () => Linking.openURL(
      'mailto:support@pathwayusa.com?subject=PathwayUSA%20Support',
    ).catch(() => {}),
  },
  {
    label: 'Website',
    icon: 'globe-outline',
    action: () => Linking.openURL('https://pathwayusa.app').catch(() => {}),
  },
  {
    label: 'Report a Bug',
    icon: 'bug-outline',
    action: () => Linking.openURL(
      'mailto:support@pathwayusa.com' +
      '?subject=Bug%20Report%20-%20PathwayUSA' +
      '&body=Describe%20the%20bug%20here%3A%0A%0A' +
      'Device%3A%20iPhone%0A' +
      'App%20Version%3A%201.0%0A%0A' +
      'Steps%20to%20reproduce%3A%0A1.%20',
    ).catch(() => {}),
  },
];

export default function AboutScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={[colors.primary, colors.primary + 'cc']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.logoWrap}>
          <Ionicons name="earth" size={48} color="#fff" />
        </View>
        <Text style={styles.appName}>PathwayUSA</Text>
        <Text style={styles.tagline}>Your Path to a Brighter Future</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Version {APP_VERSION}</Text>
        </View>
      </LinearGradient>

      {/* Mission blocks */}
      {TEAM.map((item) => (
        <View key={item.role} style={[styles.card, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
          <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
          </View>
          <Text style={[styles.cardRole, { color: colors.primary }]}>{item.role}</Text>
          <Text style={[styles.cardText, { color: colors.text }]}>{item.text}</Text>
        </View>
      ))}

      {/* Contact */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CONTACT US</Text>
      {CONTACT.map((c) => (
        <TouchableOpacity
          key={c.label}
          style={[styles.contactRow, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}
          onPress={c.action}
          activeOpacity={0.8}
        >
          <View style={[styles.contactIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={c.icon} size={20} color={colors.primary} />
          </View>
          <Text style={[styles.contactLabel, { color: colors.text }]}>{c.label}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: '#fff8e1' }]}>
        <Ionicons name="warning-outline" size={16} color="#f9a825" />
        <Text style={[styles.disclaimerText, { color: '#7c6c0e' }]}>
          PathwayUSA is not a law firm and does not provide legal advice. Content is for informational purposes only. USCIS rules and fees change frequently — always verify information at uscis.gov.
        </Text>
      </View>

      <Text style={[styles.copyright, { color: colors.textLight || '#bbb' }]}>
        © {new Date().getFullYear()} PathwayUSA · All rights reserved
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 16, gap: 12 },

  hero: {
    borderRadius: 24, alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24,
    marginBottom: 8, gap: 8,
  },
  logoWrap:     { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  appName:      { fontSize: 28, fontWeight: '900', color: '#fff' },
  tagline:      { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  versionBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  versionText:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  card:     { borderRadius: 16, padding: 16, gap: 8 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardRole: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardText: { fontSize: 14, lineHeight: 22 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8, marginLeft: 4 },

  contactRow:   { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12 },
  contactIcon:  { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  contactLabel: { flex: 1, fontSize: 15, fontWeight: '600' },

  disclaimer:     { borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },

  copyright: { textAlign: 'center', fontSize: 11, marginTop: 8 },
});
