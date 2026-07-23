/**
 * ATTORNEY PORTAL — Professional Sign In / Sign Up
 * Dark navy design, distinctly separate from the client auth flow.
 * Sign In mode: email + password only (returning attorneys).
 * New Account mode: full name + email + password + firm access code.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';

const NAVY_DARK  = '#0d1b2a';
const NAVY_MID   = '#1b2f45';
const NAVY_LIGHT = '#243d57';
const NAVY_ACCENT= '#3a7bd5';
const NAVY_TEXT  = '#e8edf3';

export default function AttorneyLoginScreen({ navigation }) {
  const insets                              = useSafeAreaInsets();
  const { signIn, signUpAsAttorney, profile } = useAuth();
  const { t }                               = useLanguage();

  const [mode, setMode]           = useState('signin'); // 'signin' | 'signup'
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});

  const clear = (key) => setErrors((p) => ({ ...p, [key]: null }));

  const validateSignIn = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateSignUp = () => {
    const e = {};
    if (!name.trim())       e.name = 'Full name is required';
    if (!email.trim())      e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password)          e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (!accessCode.trim()) e.code = 'Access code is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateSignIn()) return;
    setLoading(true);
    const { data, error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) { Alert.alert('Sign In Failed', error.message); return; }
    // AuthContext will update profile; RootNavigator routes attorney automatically.
    // Extra guard: if the profile role is not attorney, warn.
    // (Profile will be fetched by AuthContext after session update — no extra check needed here)
  };

  const handleSignUp = async () => {
    if (!validateSignUp()) return;
    setLoading(true);
    const { data, error } = await signUpAsAttorney(
      email.trim(), password, name.trim(), accessCode.trim()
    );
    setLoading(false);

    if (error) {
      if (error.message === 'invalid_code') {
        setErrors((p) => ({ ...p, code: t('auth_invalid_code') }));
      } else if (error.message === 'code_used') {
        setErrors((p) => ({ ...p, code: t('auth_code_used') }));
      } else {
        Alert.alert('Sign Up Failed', error.message);
      }
      return;
    }

    if (!data?.session) {
      Alert.alert(
        'Verify Your Email',
        'We sent a confirmation link to your email. Once verified, sign in to access the Professional Portal.',
        [{ text: 'Sign In', onPress: () => setMode('signin') }],
      );
    }
    // If auto-confirmed, AuthContext detects it and routes to AttorneyStack automatically.
  };

  const isSignIn = mode === 'signin';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Dark navy header */}
      <LinearGradient
        colors={[NAVY_DARK, NAVY_MID]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={NAVY_TEXT} />
        </TouchableOpacity>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={14} color={NAVY_ACCENT} />
            <Text style={styles.badgeTxt}>Secure Professional Access</Text>
          </View>
        </View>

        <Text style={styles.headerTitle}>{t('auth_pro_portal')}</Text>
        <Text style={styles.headerSub}>{t('auth_pro_sub')}</Text>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          {['signin', 'signup'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => { setMode(m); setErrors({}); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTxt, mode === m && styles.modeTxtActive]}>
                {m === 'signin' ? t('auth_mode_signin') : t('auth_mode_signup')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Full Name — signup only */}
          {!isSignIn && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('auth_full_name')}</Text>
              <View style={[styles.inputRow, errors.name && styles.inputErr]}>
                <Ionicons name="person-outline" size={18} color="#8a9bb0" />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth_name_placeholder')}
                  placeholderTextColor="#8a9bb0"
                  value={name}
                  autoCapitalize="words"
                  onChangeText={(v) => { setName(v); clear('name'); }}
                />
              </View>
              {errors.name ? <Text style={styles.errTxt}>{errors.name}</Text> : null}
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('auth_email')}</Text>
            <View style={[styles.inputRow, errors.email && styles.inputErr]}>
              <Ionicons name="mail-outline" size={18} color="#8a9bb0" />
              <TextInput
                style={styles.input}
                placeholder="attorney@lawfirm.com"
                placeholderTextColor="#8a9bb0"
                value={email}
                onChangeText={(v) => { setEmail(v); clear('email'); }}
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
              {isSignIn && (
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotTxt}>{t('auth_forgot')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.inputRow, errors.password && styles.inputErr]}>
              <Ionicons name="lock-closed-outline" size={18} color="#8a9bb0" />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#8a9bb0"
                value={password}
                onChangeText={(v) => { setPassword(v); clear('password'); }}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPw((p) => !p)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8a9bb0" />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errTxt}>{errors.password}</Text> : null}
          </View>

          {/* Access Code — signup only */}
          {!isSignIn && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('auth_access_code')}</Text>
              <View style={[styles.inputRow, styles.codeInputRow, errors.code && styles.inputErr]}>
                <Ionicons name="key-outline" size={18} color={NAVY_ACCENT} />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder={t('auth_access_code_ph')}
                  placeholderTextColor="#8a9bb0"
                  value={accessCode}
                  onChangeText={(v) => { setAccessCode(v); clear('code'); }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
              {errors.code ? (
                <Text style={[styles.errTxt, { fontSize: 13, lineHeight: 18, marginTop: 6 }]}>{errors.code}</Text>
              ) : (
                <Text style={styles.codeHint}>
                  Contact PathwayUSA to receive your firm's access code.
                </Text>
              )}
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitDisabled]}
            onPress={isSignIn ? handleSignIn : handleSignUp}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <View style={styles.submitInner}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.submitTxt}>
                    {isSignIn ? t('auth_sign_in') : t('auth_create_account')}
                  </Text>
                </View>}
          </TouchableOpacity>

          {/* Bottom note */}
          <Text style={styles.bottomNote}>
            {isSignIn
              ? 'This portal is exclusively for licensed immigration attorneys and professionals.'
              : 'A valid firm access code is required. Each code can only be used once.'}
          </Text>
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1e2e' },

  header:     { paddingHorizontal: 20, paddingBottom: 0 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  badgeRow:   { flexDirection: 'row', marginBottom: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(58,123,213,0.2)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(58,123,213,0.4)',
  },
  badgeTxt:    { fontSize: 11, color: NAVY_ACCENT, fontWeight: '700' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: NAVY_TEXT, marginBottom: 6 },
  headerSub:   { fontSize: 14, color: 'rgba(232,237,243,0.65)', marginBottom: 20 },

  modeToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 4, marginBottom: 0,
  },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: NAVY_ACCENT },
  modeTxt:       { fontSize: 14, fontWeight: '700', color: 'rgba(232,237,243,0.5)' },
  modeTxtActive: { color: '#fff' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  card: {
    backgroundColor: '#16283b', borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
  },

  fieldGroup: { marginBottom: 18 },
  label:      { fontSize: 13, fontWeight: '700', color: 'rgba(232,237,243,0.75)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotTxt:  { fontSize: 13, color: NAVY_ACCENT, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    gap: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  codeInputRow: { borderColor: 'rgba(58,123,213,0.4)', backgroundColor: 'rgba(58,123,213,0.06)' },
  inputErr:   { borderColor: '#f44336' },
  input:      { flex: 1, fontSize: 15, color: NAVY_TEXT },
  codeInput:  { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700', letterSpacing: 1.5, fontSize: 15 },
  errTxt:     { fontSize: 12, color: '#f44336', marginTop: 5 },
  codeHint:   { fontSize: 11, color: 'rgba(232,237,243,0.4)', marginTop: 5, lineHeight: 16 },

  submitBtn: {
    backgroundColor: NAVY_ACCENT, paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: 6,
  },
  submitDisabled: { opacity: 0.6 },
  submitInner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitTxt:      { color: '#fff', fontSize: 15, fontWeight: '800' },

  bottomNote: {
    fontSize: 11, color: 'rgba(232,237,243,0.35)',
    textAlign: 'center', lineHeight: 16, marginTop: 16,
  },
});
