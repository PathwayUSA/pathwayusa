import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xfuffsilhsdkhgnniiqh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdWZmc2lsaHNka2hnbm5paXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDU1NTMsImV4cCI6MjA5NTEyMTU1M30.MGJLCtzkrdGs-FkyL80-UPZfzzT4eBS5WKk284tT5mY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Implicit flow: tokens arrive in the URL fragment (#) after Supabase
    // verifies the email. PKCE cannot be used on mobile because the code
    // verifier is lost when the OS kills the app before the user taps the
    // email link.
    flowType: 'implicit',
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
