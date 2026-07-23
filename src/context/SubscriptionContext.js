import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const SUB_KEY = '@pathwayusa/subscription_tier';

const SubscriptionContext = createContext({
  tier: 'free',
  isPro: false,
  isBasic: false,
  isFree: true,
  subscription: null,
  loading: true,
  refresh: () => {},
  activateTier: () => {},
  cancelSubscription: () => {},
});

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [tier, setTier]               = useState('free');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    if (!user) { setTier('free'); setSubscription(null); setLoading(false); return; }

    const cached = await AsyncStorage.getItem(SUB_KEY);
    if (cached === 'pro' || cached === 'basic') setTier('pro');

    const [profileResult, subResult] = await Promise.all([
      supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
      supabase.from('subscriptions').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    // profiles.subscription_tier is the authoritative source
    const profileTier = profileResult.data?.subscription_tier ?? 'free';
    const rawPlan = subResult.data?.status === 'active' ? (subResult.data.plan ?? 'free') : 'free';
    const subTier = rawPlan === 'basic' ? 'pro' : rawPlan;
    const activeTier = (profileTier === 'pro' || subTier === 'pro') ? 'pro' : 'free';

    setSubscription(subResult.data ?? null);
    setTier(activeTier);
    await AsyncStorage.setItem(SUB_KEY, activeTier);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const activateTier = useCallback(async (planTier, { stripeCustomerId, stripeSubscriptionId } = {}) => {
    if (!user) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        status: 'active',
        plan: planTier,
        stripe_customer_id: stripeCustomerId ?? null,
        stripe_subscription_id: stripeSubscriptionId ?? null,
        created_at: now,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (planTier === 'pro') {
      await supabase.from('profiles').update({ pro_subscriber: true, subscription_tier: 'pro' }).eq('id', user.id);
    }
    setSubscription(data ?? null);
    setTier(planTier);
    await AsyncStorage.setItem(SUB_KEY, planTier);
  }, [user]);

  // Legacy alias for existing call sites
  const activatePro = useCallback((opts) => activateTier('pro', opts), [activateTier]);

  const cancelSubscription = useCallback(async () => {
    if (!user) return;
    await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('user_id', user.id);
    await supabase.from('profiles').update({ pro_subscriber: false, subscription_tier: 'free' }).eq('id', user.id);
    setTier('free');
    setSubscription((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    await AsyncStorage.setItem(SUB_KEY, 'free');
  }, [user]);

  const isPro   = tier === 'pro';
  const isBasic = isPro; // legacy alias — basic tier removed, all former basic users are now pro
  const isFree  = tier === 'free';

  return (
    <SubscriptionContext.Provider value={{
      tier, isPro, isBasic, isFree,
      subscription, loading,
      refresh: load,
      activateTier, activatePro,
      cancelSubscription,
      cancelPro: cancelSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
