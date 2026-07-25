import { useEffect, useState } from 'react';
import { resolvePhotoSrc } from '../../utils/photoStorage';

/** Affiche une photo qu'elle vive dans Supabase Storage (via une URL signée résolue à la
 * volée) ou en data URL intégrée pour les données antérieures à la migration. Centralise
 * l'asynchronisme pour que les composants appelants restent déclaratifs. */
export default function StoredImage({ path, legacyUrl, alt = '', className, placeholder = null }) {
  const [src, setSrc] = useState(() => (path ? null : legacyUrl || null));

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setSrc(legacyUrl || null);
      return () => {};
    }
    setSrc(null);
    resolvePhotoSrc({ path, legacyUrl }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [path, legacyUrl]);

  if (!src) return placeholder;
  return <img src={src} alt={alt} className={className} />;
}
