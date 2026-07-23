import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Both basic and pro prices map to tier = "pro" (basic was grandfathered into pro).
const PRICE_TO_TIER: Record<string, string> = {};
const BASIC_PRICE = Deno.env.get("STRIPE_BASIC_PRICE_ID");
const PRO_PRICE   = Deno.env.get("STRIPE_PRO_PRICE_ID");
if (BASIC_PRICE) PRICE_TO_TIER[BASIC_PRICE] = "pro";
if (PRO_PRICE)   PRICE_TO_TIER[PRO_PRICE]   = "pro";

// Look up our user_id for a given Stripe customer.
// 1. Use subscription metadata set at checkout time (most reliable).
// 2. Fall back to stripe_customer_id stored on profiles.
async function resolveUserId(customerId: string, subMetaUserId?: string): Promise<string | null> {
  if (subMetaUserId) return subMetaUserId;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.id ?? null;
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    return new Response("Webhook Error: " + err.message, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription" && session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items.data[0].price.id;
      const tier = PRICE_TO_TIER[priceId] ?? "pro";
      const userId = await resolveUserId(session.customer as string, sub.metadata?.supabase_user_id);
      if (userId) {
        await supabase.from("subscriptions").upsert({
          user_id:               userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id:    session.customer as string,
          stripe_price_id:       priceId,
          plan:                  tier,
          status:                sub.status,
          current_period_start:  new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:    new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end:  sub.cancel_at_period_end,
        }, { onConflict: "user_id" });
        await supabase.from("profiles").update({
          subscription_tier:   tier,
          subscription_status: sub.status,
          pro_subscriber:      tier === "pro",
          stripe_customer_id:  session.customer as string,
        }).eq("id", userId);
      }
    }
  } else if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const priceId = sub.items.data[0].price.id;
    const tier = PRICE_TO_TIER[priceId] ?? "pro";
    await supabase.from("subscriptions").update({
      stripe_price_id:      priceId,
      plan:                 tier,
      status:               sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
    }).eq("stripe_subscription_id", sub.id);
    const { data: row } = await supabase.from("subscriptions").select("user_id").eq("stripe_subscription_id", sub.id).single();
    if (row) {
      await supabase.from("profiles").update({
        subscription_tier:   tier,
        subscription_status: sub.status,
        pro_subscriber:      tier === "pro",
      }).eq("id", row.user_id);
    }
  } else if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await supabase.from("subscriptions").update({ status: "canceled", plan: "free" }).eq("stripe_subscription_id", sub.id);
    const { data: row } = await supabase.from("subscriptions").select("user_id").eq("stripe_subscription_id", sub.id).single();
    if (row) {
      await supabase.from("profiles").update({
        subscription_tier:   "free",
        subscription_status: "canceled",
        pro_subscriber:      false,
      }).eq("id", row.user_id);
    }
  } else if (event.type === "invoice.payment_failed") {
    const inv = event.data.object as Stripe.Invoice;
    if (inv.subscription) {
      await supabase.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", inv.subscription as string);
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
