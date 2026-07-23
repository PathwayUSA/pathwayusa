import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';

const TEAL = '#1DB89A';

export default function ForgotPasswordScreen({ navigation }) {
  const insets           = useSafeAreaInsets();
  const { forgotPassword } = useAuth();
  const { t }            = useLanguage();

  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const handleSend = async () => {
    if (!email.trim()) { setErrMsg('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrMsg('Enter a valid email address.'); return; }
    setErrMsg('');
    setLoading(true);
    const { error } = await forgotPassword(email.trim());
    setLoading(false);
    if (error) { setErrMsg(error.message); return; }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={['#0a5c4a', TEAL]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="lock-open-outline" size={28} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>{t('auth_forgot_title')}</Text>
        <Text style={styles.headerSub}>{t('auth_forgot_sub')}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.card}>
          {sent ? (
            /* Success state */
            <View style={styles.successWrap}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={54} color={TEAL} />
              </View>
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMsg}>{t('auth_reset_sent')}</Text>
              <TouchableOpacity
                style={styles.backSignInBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.backSignInTxt}>{t('auth_back_signin')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Form state */
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t('auth_email')}</Text>
                <View style={[styles.inputRow, errMsg && styles.inputErr]}>
                  <Ionicons name="mail-outline" size={19} color="#bbb" />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth_email_placeholder')}
                    placeholderTextColor="#ccc"
                    value={email}
                    onChangeText={(v) => { setEmail(v); setErrMsg(''); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>
                {errMsg ? <Text style={styles.errTxt}>{errMsg}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitDisabled]}
                onPress={handleSend}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitTxt}>{t('auth_send_reset')}</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelTxt}>{t('auth_back_signin')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5fffd' },

  header: { paddingHorizontal: 20, paddingBottom: 32 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  headerIcon:  { marginBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 20 },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, ...SHADOWS.medium },

  fieldGroup: { marginBottom: 20 },
  label:      { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    gap: 10, borderWidth: 1.5, borderColor: '#f0f0f0',
  },
  inputErr: { borderColor: '#f44336' },
  input:    { flex: 1, fontSize: 15, color: '#1a1a2e' },
  errTxt:   { fontSize: 12, color: '#f44336', marginTop: 5 },

  submitBtn: {
    backgroundColor: '#1DB89A', paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitTxt:      { color: '#fff', fontSize: 16, fontWeight: '800' },

  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelTxt: { fontSize: 14, color: '#888', fontWeight: '600' },

  // Success state
  successWrap:  { alignItems: 'center', paddingVertical: 8, gap: 12 },
  successIcon:  { marginBottom: 4 },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#1a1a2e' },
  successMsg:   { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  backSignInBtn: {
    backgroundColor: '#1DB89A', paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, marginTop: 8,
  },
  backSignInTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
