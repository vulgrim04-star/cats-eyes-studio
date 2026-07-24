import { createClient } from '@supabase/supabase-js';

// La table Supabase du projet a été connectée via l'intégration marketplace Vercel, qui
// n'expose ses identifiants que sous des noms préfixés (Catseyesapp_SUPABASE_URL,
// Catseyesapp_SUPABASE_SERVICE_ROLE_KEY) — on retombe dessus si les noms "plats" n'ont
// pas été ajoutés manuellement, pour ne pas avoir à dupliquer le secret.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.Catseyesapp_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.Catseyesapp_SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseAdminConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
