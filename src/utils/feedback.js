import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';

export const FEEDBACK_KINDS = [
  { key: 'bug', label: 'Un problème' },
  { key: 'idea', label: 'Une suggestion' },
  { key: 'other', label: 'Autre' },
];

/** Enregistre un retour (ou un rapport d'erreur automatique) dans Supabase.
 * `user_id` est déduit de la session courante et jamais fourni par l'appelant : la policy
 * RLS n'accepte l'insertion que si la valeur correspond au compte connecté (ou est nulle,
 * pour les pages publiques où personne n'est authentifié). */
export async function submitFeedback({ kind = 'bug', message, errorDetail = null }) {
  const userId = useAuthStore.getState().session?.user?.id ?? null;
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    kind,
    message,
    page: typeof window !== 'undefined' ? window.location.pathname : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    error_detail: errorDetail,
  });
  if (error) {
    console.error('[feedback] submit failed', error);
    return false;
  }
  return true;
}

/** Rapport automatique quand une page plante — best-effort, ne doit jamais relancer
 * une erreur depuis un gestionnaire d'erreur. */
export function reportCrash(error, componentStack) {
  const detail = [error?.message, error?.stack, componentStack].filter(Boolean).join('\n\n').slice(0, 4000);
  submitFeedback({
    kind: 'crash',
    message: error?.message || 'Erreur inconnue',
    errorDetail: detail,
  }).catch(() => {});
}
