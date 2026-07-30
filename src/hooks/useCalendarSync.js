import { useCallback, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { flushPendingWrites } from '../utils/supabaseSyncStorage';
import { isDemoActive } from '../utils/demoFlag';
import { calendarFeedUrl, currentCalendarTarget, googleSubscribeUrl, webcalUrl } from '../utils/calendarSync';

/** Tout ce dont le bouton « Synchroniser mon agenda » a besoin.
 *
 *  L'essentiel tient dans `prepare()`, et dans une contrainte facile à manquer : le jeton
 *  d'accès au flux est créé côté navigateur, mais c'est le SERVEUR qui le vérifie, en le
 *  relisant dans les paramètres enregistrés dans Supabase (`api/ics.js`). Or les écritures
 *  des magasins sont regroupées et n'atteignent le cloud qu'au bout de 800 ms.
 *
 *  Envoyer Google ou Apple sur le flux juste après avoir créé le jeton, c'est donc les faire
 *  appeler une adresse dont le serveur ne sait encore rien : il répond « Lien invalide ou
 *  expiré », l'abonnement échoue, et rien n'indique que réessayer dix secondes plus tard
 *  aurait marché. Pire, Google conserve l'agenda en échec dans la liste de la salonnière. On
 *  force donc l'envoi et on attend sa confirmation avant de proposer quoi que ce soit.
 *
 *  Le jeton n'est créé qu'ici, à la demande : un compte qui n'utilise jamais la
 *  synchronisation n'a aucune raison de porter un secret d'accès à son planning. */
export function useCalendarSync() {
  const ownerId = useAuthStore((s) => s.session?.user?.id);
  const ensureCalendarToken = useSettingsStore((s) => s.ensureCalendarToken);
  const [target] = useState(currentCalendarTarget);

  /** Renvoie `{ ok, feedUrl, reason }`. `ok: false` ⇒ ne rien ouvrir : mieux vaut un message
   *  que d'envoyer la salonnière s'abonner à un flux qui la refusera. */
  const prepare = useCallback(async () => {
    if (typeof window === 'undefined') return { ok: false, feedUrl: '', reason: 'signed-out' };
    if (isDemoActive()) return { ok: false, feedUrl: '', reason: 'demo' };
    if (!ownerId) return { ok: false, feedUrl: '', reason: 'signed-out' };

    const token = ensureCalendarToken();
    const feedUrl = calendarFeedUrl({ origin: window.location.origin, ownerId, token });
    if (!feedUrl) return { ok: false, feedUrl: '', reason: 'signed-out' };

    // Laisse le middleware de persistance enregistrer l'écriture déclenchée juste au-dessus
    // avant qu'on n'en réclame l'envoi.
    await Promise.resolve();
    const results = await flushPendingWrites();
    if (results.some((sent) => sent === false)) return { ok: false, feedUrl, reason: 'not-published' };

    return { ok: true, feedUrl, reason: 'ready' };
  }, [ownerId, ensureCalendarToken]);

  return {
    /** Plateforme la plus probable, pour mettre le bon choix en avant. */
    target,
    /** Garantit que le serveur reconnaîtra le flux, puis renvoie son adresse. */
    prepare,
    subscribeUrls: (feedUrl) => ({ apple: webcalUrl(feedUrl), google: googleSubscribeUrl(feedUrl) }),
  };
}
