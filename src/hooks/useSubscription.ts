import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type Plan = 'free' | 'basic' | 'pro';

export function useSubscription() {
  const { user, profile } = useAuth();
  const [plan, setPlan] = useState<Plan>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [renewsAt, setRenewsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Seed immediately from the profile already held by AuthContext — no extra round-trip on mount.
  // subscription_tier is the authoritative column; fall back to legacy plan column.
  useEffect(() => {
    if (!profile) { if (!user) setLoading(false); return; }
    setPlan((profile.subscription_tier as Plan) || (profile.plan as Plan) || 'free');
    setSubscriptionStatus(profile.subscription_status ?? null);
    setRenewsAt(profile.current_period_end ?? null);
    setLoading(false);
  }, [profile, user]);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('plan, subscription_tier, subscription_status, current_period_end')
      .eq('id', user.id)
      .single();
    if (data) {
      setPlan((data.subscription_tier as Plan) || (data.plan as Plan) || 'free');
      setSubscriptionStatus(data.subscription_status ?? null);
      setRenewsAt(data.current_period_end ?? null);
    }
    setLoading(false);
  }, [user]);

  const isPro   = plan === 'pro';
  const isBasic = plan === 'basic' || plan === 'pro';
  const isFree  = plan === 'free';

  return { plan, isPro, isBasic, isFree, subscriptionStatus, renewsAt, loading, refresh };
}
