import {
  hasSupabaseAdminConfig,
  getSupabaseAdmin,
  serverAndClientAgreeOnProject,
} from './_lib/supabaseAdmin.js';
import { isTestSender } from './_lib/email.js';
import { hasVapidConfig, vapidKeysMatch } from './_lib/push.js';

// Diagnostic de configuration serveur.
//
// Raison d'être : quand un e-mail ne partait pas, il n'existait aucun moyen de savoir
// pourquoi sans accès au tableau de bord Vercel. Les trois causes possibles (variables
// Supabase absentes, identifiants Supabase invalides, clé Resend absente) se confondaient
// toutes en un « Erreur serveur. » indistinct. Une réservation continuait d'être enregistrée,
// donc rien ne signalait le problème — la salonnière ne l'aurait découvert qu'au premier
// no-show.
//
// Ne renvoie QUE des booléens et des catégories d'erreur : jamais une valeur d'environnement,
// jamais un fragment de clé, jamais le message brut de Supabase (qui contient l'URL du
// projet). Les détails complets partent dans les logs serveur, pas dans la réponse.
export default async function handler(req, res) {
  const checks = {
    supabaseConfigured: hasSupabaseAdminConfig(),
    supabaseReachable: false,
    // null = indéterminable (une des deux URL manque ou est malformée)
    supabaseSameProjectAsClient: serverAndClientAgreeOnProject(),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    senderDomainConfigured: !isTestSender(),
    vapidConfigured: hasVapidConfig(),
    // La clé publique existe en DEUX exemplaires : sans préfixe pour le serveur, avec
    // préfixe VITE_ pour le navigateur. N'ajouter que la première est l'erreur la plus
    // fréquente, et la plus discrète : le serveur est prêt à envoyer, mais aucun appareil
    // n'a jamais pu s'abonner, donc il n'a personne à qui écrire. Rappel : une variable
    // VITE_ est figée dans le bundle à la construction — l'ajouter exige un redéploiement.
    vapidClientKeyConfigured: Boolean(process.env.VITE_VAPID_PUBLIC_KEY),
    // Les deux clés publiques doivent être IDENTIQUES, pas seulement présentes. Un caractère
    // perdu au collage et chaque envoi est refusé par un 403, alors que tous les autres
    // contrôles restent verts. null = indéterminable, une des deux manque.
    vapidKeysMatch: vapidKeysMatch(),
  };

  if (checks.supabaseConfigured) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from('app_state').select('store_key').limit(1);
      if (error) {
        console.error('[api/health] requête Supabase admin en échec', error);
        checks.supabaseError = error.code || 'query-failed';
      } else {
        checks.supabaseReachable = true;
      }
    } catch (err) {
      // createClient lève si l'URL est malformée (espace, retour à la ligne, préfixe absent).
      console.error('[api/health] création du client Supabase admin en échec', err);
      checks.supabaseError = 'client-init-failed';
    }
  }

  // « ready » = les deux fonctionnalités d'e-mail peuvent réellement aboutir vers une
  // destinataire quelconque. Sans senderDomainConfigured, Resend n'accepte que l'adresse du
  // titulaire du compte : la confirmation à la cliente échouerait.
  const ready =
    checks.supabaseConfigured &&
    checks.supabaseReachable &&
    checks.resendConfigured &&
    checks.senderDomainConfigured;

  res.status(200).json({ ready, checks });
}
