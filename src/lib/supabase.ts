import { createClient } from '@supabase/supabase-js';
import { verifyPublicAnonKey } from '../utils/security';

// Credenciales públicas de Supabase para cliente (RLS habilitado)
// Fallback seguro si las variables de entorno no son inyectadas en la compilación de GitHub Actions o Capacitor
const DEFAULT_SUPABASE_URL = 'https://yobvpvdwssqrpowspevf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYnZwdmR3c3NxcnBvd3NwZXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzExMTUsImV4cCI6MjEwNDEwNzExNX0.dGE7WAQtgBVBgQYJeD0GaDgC7R39GZ65t1LDt98lfRw';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();

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

