import { hasSupabaseAdminConfig, getSupabaseAdmin } from './_lib/supabaseAdmin.js';

// Supprime définitivement le compte de connexion et toutes les données de la personne
// QUI APPELLE la fonction. L'identifiant est toujours déduit du jeton d'accès vérifié
// côté serveur, jamais d'un user_id fourni par le navigateur : un compte ne peut donc
// jamais en supprimer un autre.
//
// Appelée uniquement depuis src/pages/ConfirmDeleteAccount.jsx, après que la personne a
// cliqué sur le lien de confirmation reçu par e-mail (session de récupération Supabase =
// preuve qu'elle contrôle bien cette adresse).
//
// Historiquement prévue en Edge Function Supabase (voir supabase/README.md), réécrite ici
// parce que les fonctions Vercel se déploient automatiquement au `git push`, sans étape
// manuelle dans un tableau de bord.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Session manquante.' });
    return;
  }

  if (!hasSupabaseAdminConfig()) {
    res.status(500).json({ error: 'Configuration serveur manquante.' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    // Vérifie le jeton auprès de Supabase et en déduit l'identité de l'appelante.
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      res.status(401).json({ error: 'Session invalide ou expirée.' });
      return;
    }
    const userId = userData.user.id;

    // Les trois tables déclarent `on delete cascade` sur auth.users, donc la suppression
    // du compte suffirait ; on les vide explicitement d'abord pour que les données
    // disparaissent même si une contrainte venait à être modifiée plus tard.
    await supabase.from('app_state').delete().eq('user_id', userId);
    await supabase.from('booking_requests').delete().eq('owner_id', userId);
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[api/delete-account] deleteUser failed', deleteError);
      res.status(500).json({ error: 'La suppression du compte a échoué.' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[api/delete-account] unexpected error', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
