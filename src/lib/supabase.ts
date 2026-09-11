import { createClient } from '@supabase/supabase-js';
import { verifyPublicAnonKey } from '../utils/security';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Medida de seguridad: Validar que no se haya filtrado una service_role key en frontend
const keySafety = verifyPublicAnonKey(supabaseAnonKey);
if (!keySafety.isSafe && import.meta.env.DEV) {
  console.warn(keySafety.warning);
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  keySafety.isSafe
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

