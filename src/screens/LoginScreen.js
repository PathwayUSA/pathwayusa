import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import PathwayLogo from '../components/PathwayLogo';

export default function LoginScreen({ navigation }) {
  const insets     = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { t }      = useLanguage();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Sign In Failed', error.message);
    // Success → AuthContext updates user → App.js routes automatically
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={['#0a5c4a', '#1DB89A']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.authHero}>
          <PathwayLogo variant="full" size={100} />
          <Text style={styles.authTitle}>{t('auth_welcome_back')}</Text>
          <Text style={styles.authSub}>{t('auth_sign_in_journey')}</Text>
        </View>
        <View style={styles.card}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('auth_email')}</Text>
            <View style={[styles.inputRow, errors.email && styles.inputErr]}>
              <Ionicons name="mail-outline" size={19} color="#bbb" />
              <TextInput
                style={styles.input}
                placeholder={t('auth_email_placeholder')}
                placeholderTextColor="#ccc"
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: null })); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
            {errors.email ? <Text style={styles.errTxt}>{errors.email}</Text> : null}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('auth_password')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotTxt}>{t('auth_forgot')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputRow, errors.password && styles.inputErr]}>
              <Ionicons name="lock-closed-outline" size={19} color="#bbb" />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#ccc"
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: null })); }}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPw((p) => !p)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color="#bbb" />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errTxt}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitTxt}>{t('auth_sign_in')}</Text>}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchTxt}>{t('auth_no_account')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.switchLink}>{t('auth_create_account')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const TEAL = '#1DB89A';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5fffd' },

  header: { paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 28 },

  authHero:  { alignItems: 'center', marginBottom: 28 },
  authTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a2e', marginTop: 20, marginBottom: 6, textAlign: 'center' },
  authSub:   { fontSize: 16, color: '#7F8C8D', lineHeight: 23, textAlign: 'center' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, ...SHADOWS.medium },

  fieldGroup: { marginBottom: 20 },
  label:      { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotTxt:  { fontSize: 15, color: TEAL, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    gap: 10, borderWidth: 1.5, borderColor: '#f0f0f0',
  },
  inputErr:  { borderColor: '#f44336' },
  input:     { flex: 1, fontSize: 17, color: '#1a1a2e' },
  errTxt:    { fontSize: 14, color: '#f44336', marginTop: 5 },

  submitBtn: {
    backgroundColor: TEAL, paddingVertical: 18,
    borderRadius: 14, alignItems: 'center', marginTop: 4, minHeight: 58,
  },
  submitDisabled: { opacity: 0.7 },
  submitTxt:  { color: '#fff', fontSize: 18, fontWeight: '800' },

  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  switchTxt:  { fontSize: 16, color: '#888' },
  switchLink: { fontSize: 16, color: TEAL, fontWeight: '700' },
});
