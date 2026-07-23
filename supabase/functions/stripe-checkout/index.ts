import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization")! } } });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { priceId, successUrl, cancelUrl } = await req.json();
    const validPrices = [Deno.env.get("STRIPE_BASIC_PRICE_ID"), Deno.env.get("STRIPE_PRO_PRICE_ID")];
    if (!validPrices.includes(priceId)) return new Response(JSON.stringify({ error: "Invalid price ID" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await adminClient.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } });
      customerId = customer.id;
      await adminClient.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }
    const session = await stripe.checkout.sessions.create({ customer: customerId, payment_method_types: ["card"], line_items: [{ price: priceId, quantity: 1 }], mode: "subscription", success_url: successUrl ?? "pathwayusa://payment-success", cancel_url: cancelUrl ?? "pathwayusa://payment-cancel", subscription_data: { metadata: { supabase_user_id: user.id } } });
    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
