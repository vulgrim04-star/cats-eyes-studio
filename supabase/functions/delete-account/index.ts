// Edge Function "delete-account" — supprime définitivement le compte de connexion et
// toutes les données de la personne QUI APPELLE la fonction (jamais un user_id fourni
// par le client : on le déduit du JWT authentifié, pour qu'un compte ne puisse jamais
// en supprimer un autre).
//
// Appelée uniquement depuis src/pages/ConfirmDeleteAccount.jsx, après que la
// personne a cliqué sur le lien de confirmation envoyé par email (session de
// récupération Supabase = preuve qu'elle contrôle bien cette adresse email).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonResponse = (body, status) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Client scopé au JWT de l'appelante — sert uniquement à vérifier qui appelle.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Session invalide ou expirée' }, 401);
    }
    const userId = userData.user.id;

    // Client admin (clé service_role) — jamais exposé au navigateur, utilisé uniquement ici.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await adminClient.from('app_state').delete().eq('user_id', userId);
    await adminClient.from('booking_requests').delete().eq('owner_id', userId);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
