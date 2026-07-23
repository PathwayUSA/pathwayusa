import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const TEAL = '#1DB89A';

export default function PasswordResetScreen() {
  const insets = useSafeAreaInsets();
  const { clearPasswordReset } = useAuth();

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState({});

  const validate = () => {
    const e = {};
    if (!password)              e.password = 'New password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!confirm)               e.confirm = 'Please confirm your new password';
    else if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    // Password updated — clear the recovery gate so the app navigates normally
    clearPasswordReset();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0a5c4a', TEAL]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerIcon}>
          <Ionicons name="lock-closed-outline" size={28} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>Set New Password</Text>
        <Text style={styles.headerSub}>
          Choose a strong password for your PathwayUSA account.
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.card, SHADOWS.medium]}>
          {/* New password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={[styles.inputRow, errors.password && styles.inputErr]}>
              <Ionicons name="lock-closed-outline" size={19} color="#bbb" />
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#ccc"
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: null })); }}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowPw((p) => !p)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color="#bbb" />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errTxt}>{errors.password}</Text> : null}
          </View>

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={[styles.inputRow, errors.confirm && styles.inputErr]}>
              <Ionicons name="lock-closed-outline" size={19} color="#bbb" />
              <TextInput
                style={styles.input}
                placeholder="Repeat your new password"
                placeholderTextColor="#ccc"
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setErrors((p) => ({ ...p, confirm: null })); }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm((p) => !p)}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={19} color="#bbb" />
              </TouchableOpacity>
            </View>
            {errors.confirm ? <Text style={styles.errTxt}>{errors.confirm}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitTxt}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5fffd' },

  header:      { paddingHorizontal: 20, paddingBottom: 32 },
  headerIcon:  { marginBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 20 },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },

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
    backgroundColor: TEAL, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitTxt:      { color: '#fff', fontSize: 16, fontWeight: '800' },
});
