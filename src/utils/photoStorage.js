import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { isDemoActive } from './demoFlag';
import { fileToResizedBlob } from './image';

export const PHOTO_BUCKET = 'client-photos';

// Les URL signées expirent ; on les met en cache un peu moins longtemps que leur validité
// réelle pour ne jamais servir un lien tout juste périmé depuis le cache.
const SIGNED_URL_TTL_SECONDS = 3600;
const CACHE_MARGIN_MS = 60_000;
const urlCache = new Map(); // path -> { url, expiresAt }

function currentUserId() {
  return useAuthStore.getState().session?.user?.id ?? null;
}

/** Chemin de stockage. Le premier segment est l'identifiant du compte : les policies RLS
 * du bucket n'autorisent l'accès que si ce segment correspond à `auth.uid()`, ce qui isole
 * techniquement les photos de chaque salon. */
function buildPath(userId, clientId, photoId, side) {
  return `${userId}/${clientId}/${photoId}-${side}.jpg`;
}

/** Téléverse une photo de séance et renvoie son chemin de stockage, ou null en cas d'échec.
 *
 * En démonstration il n'y a pas de session : on ne tente aucun téléversement et on le signale
 * par un code dédié, pour que l'appelant affiche un message juste au lieu d'un faux
 * « vérifie ta connexion ». */
export const UPLOAD_DEMO = 'demo';

export async function uploadClientPhoto(file, { clientId, photoId, side }) {
  if (isDemoActive()) return UPLOAD_DEMO;
  const userId = currentUserId();
  if (!userId) return null;
  try {
    const blob = await fileToResizedBlob(file, 900, 0.8);
    const path = buildPath(userId, clientId, photoId, side);
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) {
      console.error('[photoStorage] upload failed', error);
      return null;
    }
    urlCache.delete(path);
    return path;
  } catch (err) {
    console.error('[photoStorage] upload threw', err);
    return null;
  }
}

/** URL signée pour afficher une photo privée. Mise en cache pour éviter une requête
 * réseau à chaque rendu de la grille de photos. */
export async function getPhotoUrl(path) {
  if (!path) return null;
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error('[photoStorage] signed url failed', error);
    return null;
  }
  urlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000 - CACHE_MARGIN_MS,
  });
  return data.signedUrl;
}

/** Supprime les fichiers d'une séance photo. Best-effort : si la suppression échoue, la
 * séance disparaît quand même de la fiche cliente (on ne bloque pas l'utilisatrice sur un
 * fichier résiduel). */
export async function deleteStoredPhotos(paths) {
  const valid = paths.filter(Boolean);
  if (valid.length === 0) return;
  valid.forEach((p) => urlCache.delete(p));
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(valid);
  if (error) console.error('[photoStorage] remove failed', error);
}

/** Convertit une photo stockée en data URL, nécessaire pour jsPDF (`addImage` ne sait pas
 * charger une URL distante de façon synchrone). */
export async function pathToDataUrl(path) {
  const url = await getPhotoUrl(path);
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('[photoStorage] fetch for PDF failed', err);
    return null;
  }
}

/** Source affichable d'une photo, quelle que soit sa génération : chemin de stockage
 * (nouveau) ou data URL intégrée (données créées avant la migration). */
export async function resolvePhotoSrc({ path, legacyUrl }) {
  if (path) return getPhotoUrl(path);
  return legacyUrl || null;
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Déplace vers Storage les photos encore stockées en data URL dans la fiche cliente.
 * Chaque photo migrée est immédiatement remplacée par son chemin, ce qui allège le blob
 * synchronisé à chaque enregistrement. Idempotent : relancer la migration ne retraite que
 * ce qui reste à faire. */
export async function migrateInlinePhotos(clients, updatePhotoSession) {
  const userId = currentUserId();
  if (!userId) return { migrated: 0, failed: 0 };
  let migrated = 0;
  let failed = 0;

  for (const client of clients) {
    for (const photo of client.photos ?? []) {
      for (const side of ['before', 'after']) {
        const legacyKey = `${side}Url`;
        const pathKey = `${side}Path`;
        const legacy = photo[legacyKey];
        if (!legacy || !legacy.startsWith('data:') || photo[pathKey]) continue;

        try {
          const blob = dataUrlToBlob(legacy);
          const path = buildPath(userId, client.id, photo.id, side);
          const { error } = await supabase.storage
            .from(PHOTO_BUCKET)
            .upload(path, blob, { contentType: blob.type, upsert: true });
          if (error) throw error;
          updatePhotoSession(client.id, photo.id, { [pathKey]: path, [legacyKey]: '' });
          migrated += 1;
        } catch (err) {
          console.error('[photoStorage] migration failed', err);
          failed += 1;
        }
      }
    }
  }

  return { migrated, failed };
}

/** Nombre de photos encore stockées en ligne, pour n'afficher l'action de migration que
 * lorsqu'elle a réellement quelque chose à faire. */
export function countInlinePhotos(clients) {
  return (clients ?? []).reduce(
    (total, client) =>
      total +
      (client.photos ?? []).reduce(
        (n, photo) =>
          n +
          (photo.beforeUrl?.startsWith('data:') && !photo.beforePath ? 1 : 0) +
          (photo.afterUrl?.startsWith('data:') && !photo.afterPath ? 1 : 0),
        0
      ),
    0
  );
}
