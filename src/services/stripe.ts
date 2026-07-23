import { Linking } from 'react-native';
import { supabase } from '../lib/supabase';

export const PLANS = {
  basic: {
    priceId: 'price_1TfqILC8Fi1C4pEKH99wWkIS',
    introPrice: '$2.99',
    regularPrice: '$4.99',
    label: 'Basic',
  },
  pro: {
    // TODO: update priceId in Stripe dashboard to match $6.99/mo before releasing
    priceId: 'price_1TfqPJC8Fi1C4pEKrrgf31Ew',
    introPrice: '$6.99',
    regularPrice: '$6.99',
    label: 'Pro',
  },
} as const;

export type PlanKey = keyof typeof PLANS;

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in to continue.');
  return session;
}

export async function startCheckout(planKey: PlanKey): Promise<void> {
  const session = await getSession();
  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: { priceId: PLANS[planKey].priceId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(error.message ?? 'Checkout failed.');
  if (!data?.url) throw new Error('No checkout URL returned.');
  await Linking.openURL(data.url);
}

export async function openBillingPortal(): Promise<void> {
  const session = await getSession();
  const { data, error } = await supabase.functions.invoke('stripe-portal', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(error.message ?? 'Could not open billing portal.');
  if (!data?.url) throw new Error('No portal URL returned.');
  await Linking.openURL(data.url);
}
