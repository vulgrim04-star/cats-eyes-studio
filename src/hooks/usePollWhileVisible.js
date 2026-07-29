import { useEffect, useRef } from 'react';

/** Exécute `callback` au montage, à chaque retour de l'app au premier plan, puis toutes
 *  les `intervalMs` tant qu'elle y reste.
 *
 *  Pourquoi sonder alors qu'un abonnement temps réel existe : `postgres_changes` exige
 *  que la table soit publiée dans `supabase_realtime` côté base de données. Si elle ne
 *  l'est pas, l'abonnement se connecte sans la moindre erreur et ne reçoit jamais rien —
 *  une panne parfaitement silencieuse. Même publiée, le socket tombe sur un réseau mobile
 *  ou après une longue mise en veille. Le sondage est le filet : il coûte une requête par
 *  minute, uniquement quand l'écran est allumé et l'app au premier plan. App fermée, c'est
 *  la notification push qui prend le relais. */
export function usePollWhileVisible(callback, { intervalMs = 60000, enabled = true } = {}) {
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const run = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        latest.current?.();
      }
    };
    const runIfForeground = () => {
      if (document.visibilityState === 'visible') latest.current?.();
    };

    run();
    const timer = setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', runIfForeground);
    window.addEventListener('focus', runIfForeground);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', runIfForeground);
      window.removeEventListener('focus', runIfForeground);
    };
  }, [enabled, intervalMs]);
}
