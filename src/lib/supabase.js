import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xfuffsilhsdkhgnniiqh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdWZmc2lsaHNka2hnbm5paXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDU1NTMsImV4cCI6MjA5NTEyMTU1M30.MGJLCtzkrdGs-FkyL80-UPZfzzT4eBS5WKk284tT5mY';

const isWeb = Platform.OS === 'web';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: the redirect lands back on the same origin/tab, so the code
    // verifier survives and supabase-js can auto-detect + exchange the
    // `?code=` param itself — no manual URL parsing needed (see AuthContext).
    // Native: kept on implicit flow. PKCE can't be used there because the
    // code verifier is lost when the OS kills the app before the user taps
    // the email link, so tokens arrive directly in the URL fragment instead
    // and AuthContext parses them manually via a deep-link listener.
    detectSessionInUrl: isWeb,
    flowType: isWeb ? 'pkce' : 'implicit',
  },
});

// Call this from any screen to verify the connection is live.
// Returns { ok: true } on success or { ok: false, error: string } on failure.
export async function testConnection() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (res.ok) {
      const json = await res.json();
      return { ok: true, version: json.version };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
