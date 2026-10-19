// ═══════════════════════════════════════════════════════════
// Supabase Client — ECONO
// ═══════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

// These will be set via environment variables (.env file)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** @type {boolean} */
export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
export let supabase = null;

if (isSupabaseConfigured) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn(
    '⚠️ Supabase no configurado. Crea un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.\n' +
    'La app funcionará en modo local (localStorage) sin autenticación.'
  );
}
