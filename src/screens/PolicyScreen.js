import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import { useSpeech } from '../hooks/useSpeech';
import { Ionicons } from '@expo/vector-icons';

const PRIVACY = `Last updated: January 1, 2025

1. INFORMATION WE COLLECT
We collect information you provide when creating an account (name, email address), information about your immigration journey (path, country of origin, progress), quiz and flashcard activity, and app usage data to improve your experience.

2. HOW WE USE YOUR INFORMATION
We use your information to provide and improve PathwayUSA's features, personalize your learning experience, send important updates about your immigration journey, and respond to support requests. We do not sell or rent your personal information to third parties.

3. DATA STORAGE AND SECURITY
Your data is stored securely using industry-standard encryption through Supabase. Passwords are hashed and never stored in plain text. We use Row Level Security to ensure you can only access your own data.

4. DATA SHARING
We do not share your personal information with third parties except: (a) service providers who help us operate the app under strict confidentiality agreements, (b) when required by law or legal process, (c) to protect the safety of users or the public.

5. YOUR RIGHTS
You have the right to access your personal data, correct inaccurate data, delete your account and all associated data, export your data, and opt out of non-essential communications. To exercise these rights, contact support@pathwayusa.app.

6. COOKIES AND ANALYTICS
PathwayUSA uses anonymous analytics to understand how the app is used and improve features. No personally identifiable information is included in analytics data.

7. CHILDREN'S PRIVACY
PathwayUSA is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, contact us immediately.

8. CHANGES TO THIS POLICY
We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or email. Continued use of PathwayUSA after changes constitutes acceptance of the updated policy.

9. CONTACT US
For privacy questions or concerns, contact: privacy@pathwayusa.app`;

const TERMS = `Last updated: January 1, 2025

1. ACCEPTANCE OF TERMS
By using PathwayUSA, you agree to these Terms of Service. If you do not agree, do not use the app.

2. INFORMATIONAL PURPOSE ONLY
PathwayUSA provides general immigration information for educational purposes only. NOTHING in PathwayUSA constitutes legal advice. Immigration law is complex and fact-specific. Always consult a licensed immigration attorney for advice about your specific situation.

3. ACCURACY OF INFORMATION
We strive to keep information accurate and current, but immigration laws, fees, and procedures change frequently. We do not guarantee the completeness or accuracy of any information. Always verify current information at uscis.gov.

4. USER ACCOUNTS
You are responsible for maintaining the security of your account credentials. You agree not to share your account with others. You must be at least 18 years old to create an account.

5. PROHIBITED USES
You agree not to use PathwayUSA to: violate any law, submit false information, attempt to access other users' data, reverse engineer the app, or use the app for commercial purposes without permission.

6. INTELLECTUAL PROPERTY
PathwayUSA and its content are owned by PathwayUSA and protected by copyright and trademark laws. You may use the app for personal, non-commercial purposes only.

7. DISCLAIMER OF WARRANTIES
PathwayUSA is provided "as is" without warranties of any kind. We do not warrant that the app will be error-free, uninterrupted, or that results from using the app will be accurate.

8. LIMITATION OF LIABILITY
PathwayUSA shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app, including immigration decisions made based on app content.

9. TERMINATION
We reserve the right to terminate or suspend accounts that violate these Terms or that are used fraudulently.

10. GOVERNING LAW
These Terms are governed by the laws of the United States and the State of California.

11. CONTACT US
For questions about these Terms, contact: legal@pathwayusa.app`;

export default function PolicyScreen({ route }) {
  const initialTab = route?.params?.tab || 'privacy';
  const [tab, setTab] = useState(initialTab);
  const { colors } = useTheme();
  const { speak } = useSpeech();
  const insets = useSafeAreaInsets();

  const content = tab === 'privacy' ? PRIVACY : TERMS;
  const title   = tab === 'privacy' ? 'Privacy Policy' : 'Terms of Service';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab toggle */}
      <View style={[styles.tabs, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        {['privacy', 'terms'].map((t) => {
          const active = tab === t;
          const label  = t === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, active && { backgroundColor: colors.primary }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, { color: active ? '#fff' : colors.textSecondary }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity
            style={[styles.speakBtn, { borderColor: colors.primary + '40' }]}
            onPress={() => speak(content)}
          >
            <Ionicons name="volume-high-outline" size={16} color={colors.primary} />
            <Text style={[styles.speakText, { color: colors.primary }]}>Read</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.body, { color: colors.text }]}>{content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs:      { flexDirection: 'row', margin: 16, borderRadius: 14, padding: 4, gap: 4 },
  tabBtn:    { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  tabText:   { fontSize: 13, fontWeight: '700' },
  content:   { paddingHorizontal: 20, paddingTop: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heading:   { fontSize: 20, fontWeight: '800' },
  speakBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  speakText: { fontSize: 13, fontWeight: '600' },
  body:      { fontSize: 14, lineHeight: 24 },
});
