-- Cat's Eyes Studio — fonctions RPC (extrait le 2026-07-24 via pg_get_functiondef).

-- Utilisée par la page de réservation publique (/r/:ownerId) pour calculer les
-- créneaux déjà pris ce jour-là, SANS exposer les données privées des rendez-vous
-- (nom de cliente, notes...) à une visiteuse anonyme : seuls staffId/date/time/
-- duration/status sont renvoyés. SECURITY DEFINER pour pouvoir lire app_state
-- au nom du salon propriétaire, sans lui donner accès en lecture directe à toute
-- la table depuis le rôle anon.
CREATE OR REPLACE FUNCTION public.public_appointments_for_date(p_owner_id uuid, p_date text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'staffId', apt->>'staffId',
        'date', apt->>'date',
        'time', apt->>'time',
        'duration', (apt->>'duration')::int,
        'status', apt->>'status'
      )
    ),
    '[]'::jsonb
  )
  from public.app_state, jsonb_array_elements(data->'state'->'appointments') as apt
  where user_id = p_owner_id
    and store_key = 'ces-appointments'
    and apt->>'date' = p_date;
$function$;
