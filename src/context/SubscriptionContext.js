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

  // Entitlement (subscriptions row + profiles.subscription_tier/pro_subscriber) is
  // written exclusively by the stripe-webhook edge function via the service_role
  // key — see supabase_setup.sql's "SECURITY HARDENING (Phase 0)" section. Use
  // startCheckout()/openBillingPortal() from src/services/stripe.ts to change
  // plan state; there is no client-side tier mutation here anymore.

  const isPro   = tier === 'pro';
  const isBasic = isPro; // legacy alias — basic tier removed, all former basic users are now pro
  const isFree  = tier === 'free';

  return (
    <SubscriptionContext.Provider value={{
      tier, isPro, isBasic, isFree,
      subscription, loading,
      refresh: load,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
