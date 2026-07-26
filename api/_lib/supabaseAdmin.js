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

/** Le serveur et le navigateur visent-ils le même projet Supabase ? Les identifiants
 *  d'administration viennent d'une intégration Vercel, le front d'une variable VITE_ : rien
 *  ne garantit qu'ils désignent le même projet, et si ce n'est pas le cas les requêtes
 *  serveur échouent en PGRST205 (« table introuvable ») sur une base pourtant saine.
 *  Ne renvoie qu'un booléen — jamais les URL, qui identifient les projets. */
export function serverAndClientAgreeOnProject() {
  const clientUrl = process.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL || !clientUrl) return null;
  try {
    return new URL(SUPABASE_URL).host === new URL(clientUrl).host;
  } catch {
    return null; // URL malformée : la cause est ailleurs, signalée par client-init-failed
  }
}
