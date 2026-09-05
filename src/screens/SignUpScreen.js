import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS, TYPOGRAPHY } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import PathwayLogo from '../components/PathwayLogo';

export default function SignUpScreen({ navigation }) {
  const insets    = useSafeAreaInsets();
  const { signUp } = useAuth();
  const { t }     = useLanguage();

  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [inviteCode, setInviteCode]   = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});
  const [formError, setFormError]     = useState('');
  const [sent, setSent]               = useState(false);

  const clear = (key) => setErrors((p) => ({ ...p, [key]: null }));

  const validate = () => {
    const e = {};
    if (!name.trim())   e.name = 'Full name is required';
    if (!email.trim())  e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password)      e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!confirmPw)     e.confirm = 'Please confirm your password';
    else if (password !== confirmPw) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setFormError('');
    setLoading(true);
    const { data, error } = await signUp(email.trim(), password, name.trim(), inviteCode.trim());
    setLoading(false);
    if (error) {
      if (Platform.OS === 'web') {
        setFormError(error.message);
      } else {
        Alert.alert('Sign Up Failed', error.message);
      }
      return;
    }
    if (!data?.session) {
      // Email confirmation required
      if (Platform.OS === 'web') {
        setSent(true);
      } else {
        Alert.alert(
          'Check Your Email',
          'We sent a confirmation link to your email. Please verify it, then sign in.',
          [{ text: 'Sign In', onPress: () => navigation.navigate('Login') }],
        );
      }
    }
    // If session exists, AuthContext detects it → routes to onboarding automatically
  };

  const strength = password.length >= 10 ? 3 : password.length >= 6 ? 2 : password.length > 0 ? 1 : 0;
  const strengthColors = ['#e0e0e0', '#f44336', '#FF9800', '#4caf50'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];

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
          <Text style={styles.authTitle}>{t('auth_create_title')}</Text>
          <Text style={styles.authSub}>{t('auth_create_sub')}</Text>
        </View>
        <View style={styles.card}>
          {/* Full name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('auth_full_name')}</Text>
            <View style={[styles.inputRow, errors.name && styles.inputErr]}>
              <Ionicons name="person-outline" size={19} color="#bbb" />
              <TextInput
                style={styles.input}
                placeholder={t('auth_name_placeholder')}
                placeholderTextColor="#ccc"
                value={name}
                autoCapitalize="words"
                onChangeText={(v) => { setName(v); clear('name'); }}
              />
            </View>
            {errors.name ? <Text style={styles.errTxt}>{errors.name}</Text> : null}
          </View>

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
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                onChangeText={(v) => { setEmail(v); clear('email'); }}
              />
            </View>
            {errors.email ? <Text style={styles.errTxt}>{errors.email}</Text> : null}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('auth_password')}</Text>
            <View style={[styles.inputRow, errors.password && styles.inputErr]}>
              <Ionicons name="lock-closed-outline" size={19} color="#bbb" />
              <TextInput
                style={styles.input}
                placeholder={t('auth_pw_placeholder')}
                placeholderTextColor="#ccc"
                value={password}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                onChangeText={(v) => { setPassword(v); clear('password'); }}
              />
              <TouchableOpacity onPress={() => setShowPw((p) => !p)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color="#bbb" />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errTxt}>{errors.password}</Text> : null}
          </View>

          {/* Password strength */}
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {[1, 2, 3].map((l) => (
                <View key={l} style={[styles.strengthBar, { backgroundColor: strength >= l ? strengthColors[strength] : '#e8e8e8' }]} />
              ))}
              <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>{strengthLabels[strength]}</Text>
            </View>
          )}

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('auth_confirm_password')}</Text>
            <View style={[styles.inputRow, errors.confirm && styles.inputErr]}>
              <Ionicons name="lock-closed-outline" size={19} color="#bbb" />
              <TextInput
                style={styles.input}
                placeholder={t('auth_confirm_ph')}
                placeholderTextColor="#ccc"
                value={confirmPw}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                onChangeText={(v) => { setConfirmPw(v); clear('confirm'); }}
              />
              <TouchableOpacity onPress={() => setShowConfirm((p) => !p)}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={19} color="#bbb" />
              </TouchableOpacity>
            </View>
            {errors.confirm ? <Text style={styles.errTxt}>{errors.confirm}</Text> : null}
          </View>

          {/* Invite code (optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Invite Code (optional)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="gift-outline" size={19} color="#bbb" />
              <TextInput
                style={styles.input}
                placeholder="Enter a friend's code"
                placeholderTextColor="#ccc"
                value={inviteCode}
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={setInviteCode}
              />
            </View>
          </View>

          {sent ? (
            <View style={styles.sentBox}>
              <Ionicons name="checkmark-circle-outline" size={40} color={TEAL} style={{ marginBottom: 12 }} />
              <Text style={styles.sentTitle}>Check Your Email</Text>
              <Text style={styles.sentMsg}>
                We sent a confirmation link to {email}. Please verify it, then sign in.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 16 }}>
                <Text style={styles.switchLink}>{t('auth_sign_in')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {formError ? <Text style={styles.formErrTxt}>{formError}</Text> : null}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitDisabled]}
                onPress={handleSignUp}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <View style={styles.submitInner}>
                      <Text style={styles.submitTxt}>{t('auth_create_account')}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>}
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchTxt}>{t('auth_already_account')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.switchLink}>{t('auth_sign_in')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  authTitle: { fontFamily: TYPOGRAPHY.displayFamily, fontSize: TYPOGRAPHY.displaySize, letterSpacing: TYPOGRAPHY.displayLetterSpacing, color: '#1a1a2e', lineHeight: TYPOGRAPHY.displayLineHeight, marginTop: 20, marginBottom: 6, textAlign: 'center' },
  authSub:   { fontSize: 16, color: '#7F8C8D', lineHeight: 23, textAlign: 'center' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, ...SHADOWS.medium },

  fieldGroup: { marginBottom: 18 },
  label:      { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    gap: 10, borderWidth: 1.5, borderColor: '#f0f0f0',
  },
  inputErr: { borderColor: '#f44336' },
  input:    { flex: 1, fontSize: 17, color: '#1a1a2e' },
  errTxt:   { fontSize: 14, color: '#f44336', marginTop: 5 },

  strengthRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 16 },
  strengthBar:  { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:{ fontSize: 13, fontWeight: '600', width: 42 },

  submitBtn: {
    backgroundColor: TEAL, paddingVertical: 18,
    borderRadius: 14, alignItems: 'center', marginTop: 4, minHeight: 58,
  },
  submitDisabled: { opacity: 0.7 },
  submitInner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitTxt:      { color: '#fff', fontSize: 18, fontWeight: '800' },

  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  switchTxt:  { fontSize: 16, color: '#888' },
  switchLink: { fontSize: 16, color: TEAL, fontWeight: '700' },

  formErrTxt: { fontSize: 14, color: '#f44336', textAlign: 'center', marginBottom: 12 },
  sentBox:    { alignItems: 'center', paddingVertical: 24 },
  sentTitle:  { fontFamily: TYPOGRAPHY.headingFamily, fontSize: TYPOGRAPHY.headingSize, lineHeight: TYPOGRAPHY.headingLineHeight, color: '#1a1a2e', marginBottom: 8 },
  sentMsg:    { fontSize: 15, color: '#7F8C8D', lineHeight: 22, textAlign: 'center' },
});
