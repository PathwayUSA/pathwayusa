import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../context/SubscriptionContext';
import { startCheckout, openBillingPortal } from '../services/stripe';
import { SHADOWS } from '../theme';
import { successHaptic, lightHaptic } from '../utils/haptics';
import UserAvatar from '../components/UserAvatar';

const { width } = Dimensions.get('window');
const NAVY      = '#0F2A3D';
const NAVY_DARK = '#061A26';
const GOLD      = '#F5A623';
const CARD_W      = (width - 52) / 2;

const FREE_FEATURES = [
  'Daily quiz (10 questions)',
  'Roadmap overview',
  'News & updates',
  'Travel tracker',
];

const PRO_OUTCOMES = [
  'Everything in Free',
  'Unlimited quizzes',
  'Full roadmap & progress',
  'Document upload',
  'Attorney connection',
  'Offline access',
  'Priority support',
];

const WHY_UPGRADE = [
  { icon: 'shield-checkmark', color: NAVY,      text: "You won't miss a filing deadline — we track every one for you" },
  { icon: 'alert-circle',     color: '#E67E22', text: "You won't make a costly mistake — attorney help is one tap away" },
  { icon: 'people',           color: '#27AE60', text: "You'll have expert guidance at every step of your journey" },
];

export default function UpgradeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isPro, isFree, loading, refresh } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring,  setRestoring]  = useState(false);
  const [managing,   setManaging]   = useState(false);

  const handleSubscribe = async () => {
    setPurchasing(true);
    try {
      successHaptic();
      await startCheckout('pro');
      await refresh();
    } catch (err) {
      Alert.alert('Checkout Failed', err.message || 'Something went wrong. Please try again.');
    }
    setPurchasing(false);
  };

  const handleRestore = async () => {
    setRestoring(true);
    await refresh();
    if (isFree) Alert.alert('No Subscription Found', "We couldn't find an active subscription on this account.");
    setRestoring(false);
  };

  const handleManageBilling = async () => {
    setManaging(true);
    try {
      await openBillingPortal();
      await refresh();
    } catch (err) {
      Alert.alert('Billing Portal Unavailable', err.message || 'Please try again.');
    }
    setManaging(false);
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription?',
      "You'll be taken to the billing portal to cancel — your Pro access continues until the end of the current billing period.",
      [
        { text: 'Keep My Plan', style: 'cancel' },
        { text: 'Continue', onPress: handleManageBilling },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7F5' }}>
        <ActivityIndicator color={NAVY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7F5' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HERO (navy gradient) ── */}
        <LinearGradient
          colors={[NAVY, NAVY_DARK]}
          style={{ paddingTop: insets.top + 28, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center', gap: 14 }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={{ fontSize: 52 }}>👑</Text>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 40 }}>
            Go Premium
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 22, maxWidth: 280 }}>
            Unlock everything you need to complete your journey with confidence.
          </Text>

          {/* Gold CTA pill — most prominent element */}
          {!isPro && (
            <TouchableOpacity
              onPress={() => { lightHaptic(); handleSubscribe(); }}
              disabled={purchasing}
              style={{
                backgroundColor: GOLD, paddingHorizontal: 36, paddingVertical: 18,
                borderRadius: 32, marginTop: 4, minWidth: 260, alignItems: 'center',
                ...SHADOWS.medium,
              }}
              activeOpacity={0.85}
            >
              {purchasing
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>
                    7-DAY FREE TRIAL
                  </Text>
              }
            </TouchableOpacity>
          )}

          {/* Trust row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <View style={{ flexDirection: 'row' }}>
              {['trust-a', 'trust-b', 'trust-c', 'trust-d'].map((s, i) => (
                <UserAvatar
                  key={s}
                  seed={s}
                  size={30}
                  style={{
                    marginLeft: i > 0 ? -10 : 0,
                    zIndex: 4 - i,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </View>
            <View style={{ gap: 3 }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '700' }}>
                Trusted by 2.1M+ immigrants
              </Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                ⭐⭐⭐⭐⭐ 4.8 average rating
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Active Pro banner ── */}
        {isPro && (
          <View style={{ margin: 20, backgroundColor: '#EAF7EE', borderRadius: 16, padding: 20, alignItems: 'center', gap: 10 }}>
            <Ionicons name="shield-checkmark" size={32} color="#27AE60" />
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#27AE60' }}>You're a Pro Member 🎉</Text>
            <Text style={{ fontSize: 13, color: '#388e3c', textAlign: 'center', lineHeight: 20 }}>
              Full access to every feature. Thank you for supporting PathwayUSA.
            </Text>
            <TouchableOpacity onPress={handleCancel} disabled={managing} style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 13, color: '#aaa' }}>{managing ? 'Opening billing portal…' : 'Cancel subscription'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Plan comparison ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#1A1A2E', marginBottom: 16 }}>
            Choose Your Plan
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>

            {/* FREE card */}
            <View style={{ width: CARD_W, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 2, borderColor: '#E8ECE8', ...SHADOWS.small }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#7F8C8D', marginBottom: 6 }}>Free</Text>
              <Text style={{ fontSize: 30, fontWeight: '900', color: '#7F8C8D', lineHeight: 36 }}>$0</Text>
              <Text style={{ fontSize: 12, color: '#BDC3C7', marginBottom: 18 }}>Forever</Text>
              {FREE_FEATURES.map((f) => (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 9 }}>
                  <Ionicons name="checkmark" size={14} color="#BDC3C7" style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 12, color: '#7F8C8D', flex: 1, lineHeight: 18 }}>{f}</Text>
                </View>
              ))}
            </View>

            {/* PRO card */}
            <View style={{ width: CARD_W, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 2, borderColor: NAVY, ...SHADOWS.small }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: NAVY }}>Pro</Text>
                <View style={{ backgroundColor: NAVY + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: NAVY }}>POPULAR</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 14 }}>
                <Text style={{ fontSize: 26, fontWeight: '900', color: NAVY, lineHeight: 32 }}>$6.99</Text>
                <Text style={{ fontSize: 12, color: '#7F8C8D', marginBottom: 4 }}>/mo</Text>
              </View>
              {PRO_OUTCOMES.map((f) => (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 9 }}>
                  <Ionicons name="checkmark-circle" size={14} color={GOLD} style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 12, color: '#1A1A2E', flex: 1, lineHeight: 18 }}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Why upgrade (outcome-focused) ── */}
        <View style={{ marginHorizontal: 20, marginTop: 24, backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 16, ...SHADOWS.small }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: '#1A1A2E' }}>Why People Upgrade</Text>
          {WHY_UPGRADE.map((item) => (
            <View key={item.text} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: item.color + '18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ionicons name={item.icon} size={17} color={item.color} />
              </View>
              <Text style={{ fontSize: 14, color: '#333', lineHeight: 22, flex: 1 }}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Bottom CTA ── */}
        {!isPro && (
          <View style={{ paddingHorizontal: 20, marginTop: 28, gap: 10 }}>
            <TouchableOpacity
              onPress={() => { lightHaptic(); handleSubscribe(); }}
              disabled={purchasing}
              style={{ backgroundColor: GOLD, borderRadius: 16, height: 58, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, ...SHADOWS.medium }}
              activeOpacity={0.85}
            >
              {purchasing
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="star" size={20} color="#fff" />
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#fff' }}>
                      Start Free Trial – $6.99/mo
                    </Text>
                  </>
              }
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: '#BDC3C7', textAlign: 'center' }}>
              Cancel anytime. No hidden fees.
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          style={{ alignItems: 'center', paddingVertical: 20 }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, color: '#BDC3C7' }}>
            {restoring ? 'Checking...' : 'Restore previous purchase'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}
