import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

// Native: a custom URL scheme the OS deep-links back into the app.
// Web: the app's own origin — Supabase just appends the code/tokens to
// whatever we pass here, and on web that has to be a real, loadable URL
// (a browser can't navigate to `pathwayusa://...`). Exported so every
// screen that triggers an email round-trip (password reset, etc.) uses the
// same value instead of hardcoding a redirect that only half-matches the
// deep-link listener below.
export const REDIRECT_URL = Platform.OS === 'web'
  ? (typeof window !== 'undefined' ? window.location.origin : '')
  : 'pathwayusa://auth/callback';

const AuthContext = createContext({});

async function fetchProfileWithTimeout(uid) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 8000)
  );
  try {
    const { data } = await Promise.race([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      timeout,
    ]);
    return data ?? null;
  } catch {
    return null;
  }
}

// Parse key=value pairs from a URL fragment/hash string.
// e.g. "access_token=xxx&refresh_token=yyy&type=recovery" → { access_token, refresh_token, type }
function parseHashParams(hash) {
  if (!hash) return {};
  return Object.fromEntries(
    hash.split('&').map((pair) => {
      const eq = pair.indexOf('=');
      return eq === -1
        ? [pair, '']
        : [pair.slice(0, eq), decodeURIComponent(pair.slice(eq + 1))];
    })
  );
}

export function AuthProvider({ children }) {
  const [user, setUser]                         = useState(null);
  const [profile, setProfile]                   = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
  const [pendingPaymentSuccess, setPendingPaymentSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Initial session — single source of truth on startup
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          fetchProfileWithTimeout(u.id).then((data) => {
            if (!mounted) return;
            setProfile(data);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    // Auth state changes after startup (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || event === 'INITIAL_SESSION') return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        // Keep loading=true while we fetch the profile so the UI doesn't flash
        setLoading(true);
        fetchProfileWithTimeout(u.id).then((data) => {
          if (!mounted) return;
          setProfile(data);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Deep-link handler (native) ──────────────────────────────────────────────
  // Supabase email verification and password-reset links redirect to
  // pathwayusa://auth/callback#access_token=...&refresh_token=...&type=...
  // We parse the fragment and call setSession() so the supabase client is
  // authenticated. For type=recovery we gate the main app behind a password-
  // reset screen before allowing navigation.
  //
  // Web takes a different path below: PKCE + detectSessionInUrl (see
  // lib/supabase.js) makes supabase-js detect and exchange the `?code=`
  // param itself on init, before this ever runs — there are no tokens in
  // the URL for us to parse manually, and no custom scheme for `Linking`
  // to catch. We only need to read `type=recovery` off the query string.
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      if (params.get('type') === 'recovery') setPendingPasswordReset(true);
      if (window.location.href.includes('payment-success')) setPendingPaymentSuccess(true);
      return;
    }

    let mounted = true;

    function processUrl(url) {
      if (!url) return;
      if (url.includes('payment-success')) {
        if (mounted) setPendingPaymentSuccess(true);
        return;
      }
      if (!url.includes('auth/callback')) return;
      const hashIdx = url.indexOf('#');
      if (hashIdx === -1) return;
      const params = parseHashParams(url.slice(hashIdx + 1));
      const { access_token, refresh_token, type } = params;
      if (!access_token || !refresh_token) return;
      if (mounted && type === 'recovery') setPendingPasswordReset(true);
      supabase.auth.setSession({ access_token, refresh_token });
    }

    Linking.getInitialURL().then((url) => { if (url) processUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => processUrl(url));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const signUp = async (email, password, fullName, referralCode) => {
    const result = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName ?? '' },
        emailRedirectTo: REDIRECT_URL,
      },
    });
    // If auto-confirmed and fullName provided, ensure profile has the name
    if (result.data?.session && fullName && result.data?.user?.id) {
      supabase.from('profiles')
        .update({ full_name: fullName })
        .eq('id', result.data.user.id)
        .then(() => {});
    }
    // Redeem an entered invite code — only possible once a session exists (email
    // confirmation may defer this; the code is only usable at first-signup time).
    if (result.data?.session && referralCode?.trim()) {
      supabase.rpc('redeem_referral_code', { p_code: referralCode.trim().toUpperCase() })
        .then(() => {});
    }
    return result;
  };

  const signUpAsAttorney = async (email, password, fullName, accessCode) => {
    // 1. Validate the access code
    const { data: codeRow, error: codeErr } = await supabase
      .from('attorney_access_codes')
      .select('id, used')
      .eq('code', accessCode.trim().toUpperCase())
      .maybeSingle();

    if (codeErr || !codeRow) return { error: { message: 'invalid_code' } };
    if (codeRow.used)        return { error: { message: 'code_used'    } };

    // 2. Create the auth user with role in metadata (trigger sets role from metadata)
    const result = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName, role: 'attorney' },
        emailRedirectTo: REDIRECT_URL,
      },
    });
    if (result.error) return result;

    const uid = result.data?.user?.id;
    if (uid) {
      // 3. Ensure profile has role=attorney (trigger may not have role column support yet)
      await supabase.from('profiles').upsert(
        { id: uid, full_name: fullName, role: 'attorney' },
        { onConflict: 'id' }
      );
      // 4. Mark code as used (best-effort — may succeed only when session exists)
      await supabase
        .from('attorney_access_codes')
        .update({ used: true, used_by: uid })
        .eq('id', codeRow.id);
    }
    return result;
  };

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const forgotPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: REDIRECT_URL });

  const signOut = async () => {
    setProfile(null);
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const deleteAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: new Error('Not signed in') };
    const { error } = await supabase.functions.invoke('delete-account', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!error) {
      setProfile(null);
      await supabase.auth.signOut();
    }
    return { error };
  };

  const updateReadingSpeed = async (speed) => {
    if (!user) return { error: new Error('Not signed in') };
    const { error } = await supabase
      .from('profiles')
      .update({ reading_speed: speed })
      .eq('id', user.id);
    if (!error) setProfile((prev) => ({ ...prev, reading_speed: speed }));
    return { error };
  };

  const updateProfile = async (fields) => {
    if (!user) return { error: new Error('Not signed in') };
    const { error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', user.id);
    if (!error) setProfile((prev) => ({ ...prev, ...fields }));
    return { error };
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const data = await fetchProfileWithTimeout(user.id);
    setProfile(data);
    return data;
  }, [user]);

  const clearPasswordReset = () => setPendingPasswordReset(false);
  const clearPaymentSuccess = () => setPendingPaymentSuccess(false);

  return (
    <AuthContext.Provider value={{ user, profile, loading, pendingPasswordReset, pendingPaymentSuccess, signUp, signUpAsAttorney, signIn, signOut, deleteAccount, forgotPassword, updateReadingSpeed, updateProfile, refreshProfile, clearPasswordReset, clearPaymentSuccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
