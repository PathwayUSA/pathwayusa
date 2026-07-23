import React, { useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

const PLAN_META = {
  pro:  { label: 'Pro',  color: '#0F2A3D', desc: 'Unlimited quiz questions, full roadmap tracking, attorney connection, document upload, and more.' },
  free: { label: 'Free', color: '#888',    desc: 'Your features have been updated.' },
};

export default function PaymentSuccessModal() {
  const { pendingPaymentSuccess, clearPaymentSuccess } = useAuth();
  const { tier, refresh } = useSubscription();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (pendingPaymentSuccess) refresh();
  }, [pendingPaymentSuccess]);

  if (!pendingPaymentSuccess) return null;

  const meta = PLAN_META[tier] ?? PLAN_META.free;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <LinearGradient
        colors={['#0F2A3D', '#061A26']}
        style={[styles.overlay, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.checkWrap}>
          <Ionicons name="checkmark-circle" size={90} color="#fff" />
        </View>

        <Text style={styles.title}>Payment Successful!</Text>

        <View style={[styles.planBadge, { backgroundColor: meta.color }]}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.planBadgeTxt}>PathwayUSA {meta.label}</Text>
        </View>

        <Text style={styles.body}>{meta.desc}</Text>

        <View style={styles.featureRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color="rgba(255,255,255,0.8)" />
          <Text style={styles.featureTxt}>Your plan is now active</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="sync-outline" size={20} color="rgba(255,255,255,0.8)" />
          <Text style={styles.featureTxt}>No action needed — it works everywhere</Text>
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={clearPaymentSuccess}
          activeOpacity={0.85}
        >
          <Text style={styles.btnTxt}>Continue to App</Text>
          <Ionicons name="arrow-forward" size={18} color="#0F2A3D" />
        </TouchableOpacity>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 18,
  },
  checkWrap: {
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
  },
  planBadgeTxt: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  body: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureTxt: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  btn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  btnTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2A3D',
  },
});
