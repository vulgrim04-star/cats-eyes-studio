import { hasSupabaseAdminConfig, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { sendPushToUser } from './_lib/push.js';

// Envoie une notification de test à tous les appareils abonnés de la salonnière connectée.
//
// Raison d'être : la notification « app fermée » dépend de cinq conditions indépendantes
// (clés VAPID côté serveur, clé côté navigateur, permission accordée, abonnement bien
// enregistré, app installée sur l'écran d'accueil sur iPhone). Toutes échouaient en
// silence, et Paramètres affirmait « Activées — même app fermée » sans rien vérifier. Le
// problème ne se découvrait qu'à la première réservation manquée.
//
// Emprunte volontairement le même chemin d'envoi que la vraie notification
// (api/_lib/push.js) : un test qui passerait ailleurs ne prouverait rien.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'method-not-allowed' });
    return;
  }

  if (!hasSupabaseAdminConfig()) {
    res.status(500).json({ ok: false, reason: 'server-misconfigured' });
    return;
  }

  // L'identité vient du jeton de session, jamais du corps de la requête : sans ça,
  // n'importe qui pourrait faire sonner le téléphone d'un compte en devinant son id.
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ ok: false, reason: 'signed-out' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      res.status(401).json({ ok: false, reason: 'signed-out' });
      return;
    }

    const result = await sendPushToUser(supabase, data.user.id, {
      title: 'Notification de test',
      body: "Tout est en place : tu recevras les demandes de réservation, même app fermée.",
      url: '/parametres',
    });

    res.status(200).json({ ok: result.sent, reason: result.reason, count: result.count });
  } catch (err) {
    console.error('[api/push-test] erreur inattendue', err);
    res.status(500).json({ ok: false, reason: 'server-error' });
  }
}
