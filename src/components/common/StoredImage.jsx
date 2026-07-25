import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  resolvePhotoSrc,
  subscribeToPhotoCache,
  getPhotoCacheGeneration,
} from '../../utils/photoStorage';

/** Affiche une photo qu'elle vive dans Supabase Storage (via une URL signée résolue à la
 * volée) ou en data URL intégrée pour les données antérieures à la migration. Centralise
 * l'asynchronisme pour que les composants appelants restent déclaratifs. */
export default function StoredImage({ path, legacyUrl, alt = '', className, placeholder = null }) {
  const [src, setSrc] = useState(() => (path ? null : legacyUrl || null));
  // Remplacer une photo réutilise le même chemin : sans ce signal, l'effet ci-dessous ne se
  // rejouerait pas et l'ancienne image resterait affichée.
  const generation = useSyncExternalStore(subscribeToPhotoCache, getPhotoCacheGeneration);
  const shownPathRef = useRef(path);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setSrc(legacyUrl || null);
      return () => {};
    }
    // On vide l'affichage quand la photo elle-même change, mais pas lors d'une simple
    // invalidation de cache : sinon toute la grille clignoterait vers son placeholder à
    // chaque ajout de photo, pour ne réafficher qu'une image identique.
    if (shownPathRef.current !== path) {
      setSrc(null);
      shownPathRef.current = path;
    }
    resolvePhotoSrc({ path, legacyUrl }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [path, legacyUrl, generation]);

  if (!src) return placeholder;
  return <img src={src} alt={alt} className={className} />;
}
