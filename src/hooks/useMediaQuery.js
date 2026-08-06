import { useEffect, useState } from 'react';

/** Suit une media query depuis JavaScript.
 *
 *  À n'utiliser que lorsque le CSS ne suffit PAS — c'est-à-dire quand il ne s'agit pas de
 *  masquer un bloc mais de ne pas le monter du tout. Le cas typique : la colonne de
 *  réglages du Brow Lift, dont les vignettes redessinent dix paires de sourcils. La
 *  masquer en CSS sur téléphone la laisserait quand même construire, en double avec les
 *  feuilles glissantes qui reprennent le même contenu.
 *
 *  Partout ailleurs, une media query CSS reste préférable : elle s'applique avant le
 *  premier rendu, là où ce crochet répond `false` le temps d'un cycle.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const list = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    // La valeur peut avoir changé entre le premier rendu et cet effet (rotation de
    // l'écran, ouverture des outils de développement) : on la relit avant d'écouter.
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Bascule d'ossature du projet — voir l'échelle documentée dans `variables.css`. */
export const DESKTOP_QUERY = '(min-width: 768px)';
