import { useCallback, useState } from 'react';
import { usePollWhileVisible } from './usePollWhileVisible';
import { APP_VERSION, readVersionPayload, shouldOfferUpdate } from '../utils/appVersion';

/** Toutes les dix minutes tant que l'app est ouverte, plus à chaque retour au premier plan.
 *  Une requête sur un fichier de quelques octets : le coût est négligeable, et c'est le
 *  retour au premier plan qui fait l'essentiel du travail. */
const CHECK_MS = 600000;

/** Une nouvelle version est-elle en ligne ?
 *
 *  L'application connaît la version qu'elle a chargée ; `/version.json` dit ce que le
 *  serveur sert maintenant. Sur une PWA installée, ces deux-là peuvent diverger longtemps :
 *  l'app reste dans les applications récentes et resert sa page sans jamais la revalider.
 *  Rien à l'écran ne le signalait — c'est ce qui rendait « est-ce que ma mise à jour est
 *  arrivée ? » impossible à trancher. */
export function useAppUpdate() {
  const [available, setAvailable] = useState(false);

  const check = useCallback(async () => {
    if (available) return; // Déjà signalé : inutile de continuer à interroger.
    try {
      // `no-store` est indispensable : un fichier de version servi depuis le cache
      // répondrait éternellement l'ancienne version, et ne détecterait donc jamais rien.
      const response = await fetch('/version.json', { cache: 'no-store' });
      if (!response.ok) return;
      const latest = readVersionPayload(await response.json().catch(() => null));
      if (shouldOfferUpdate(APP_VERSION, latest)) setAvailable(true);
    } catch {
      // Hors ligne ou serveur injoignable : on ne sait pas, donc on ne propose rien.
    }
  }, [available]);

  usePollWhileVisible(check, { intervalMs: CHECK_MS });

  return available;
}
