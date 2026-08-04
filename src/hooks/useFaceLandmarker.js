import { useCallback, useRef, useState } from 'react';

/** Chargement et exécution du modèle de repères faciaux.
 *
 *  TOUT EST SERVI DEPUIS NOTRE PROPRE DOMAINE — `public/mediapipe/` — et jamais depuis un
 *  CDN. Trois raisons, dans cet ordre : l'application doit fonctionner hors ligne une fois
 *  installée ; une ressource tierce chargée au vol serait bloquée par la politique de
 *  sécurité du contenu ; et un CDN qui change ou disparaît casserait la fonction sans
 *  prévenir, des mois plus tard.
 *
 *  LE MODULE EST CHARGÉ À LA DEMANDE, au premier appel seulement. C'est environ 6 Mo une
 *  fois compressés : les imposer au démarrage à quelqu'un qui n'ouvrira jamais la
 *  simulation serait indéfendable. Le navigateur les met ensuite en cache.
 */

const MODEL_URL = '/mediapipe/face_landmarker.task';
const WASM_ROOT = '/mediapipe/wasm';

export const DETECTION_STATE = {
  idle: 'idle',
  loading: 'loading',
  ready: 'ready',
  running: 'running',
  failed: 'failed',
};

export function useFaceLandmarker() {
  const [state, setState] = useState(DETECTION_STATE.idle);
  const [error, setError] = useState(null);
  const landmarkerRef = useRef(null);
  // Le chargement peut être demandé deux fois de suite (double clic, rendu concurrent) :
  // on garde la promesse en cours plutôt que de télécharger 6 Mo une seconde fois.
  const loadingRef = useRef(null);

  const load = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    if (loadingRef.current) return loadingRef.current;

    setState(DETECTION_STATE.loading);
    setError(null);

    loadingRef.current = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'IMAGE',
        numFaces: 1,
      });
      landmarkerRef.current = landmarker;
      setState(DETECTION_STATE.ready);
      return landmarker;
    })();

    try {
      return await loadingRef.current;
    } catch (cause) {
      // Le repli manuel reste toujours disponible : la simulation ne doit jamais devenir
      // inutilisable parce qu'un modèle n'a pas voulu se charger.
      setState(DETECTION_STATE.failed);
      setError(cause instanceof Error ? cause.message : String(cause));
      loadingRef.current = null;
      return null;
    }
  }, []);

  /**
   * Repères d'un visage sur une image déjà chargée.
   * @param {HTMLImageElement} image
   * @returns {Promise<Array|null>} points normalisés, ou `null` si aucun visage
   */
  const detect = useCallback(
    async (image) => {
      const landmarker = await load();
      if (!landmarker || !image) return null;
      setState(DETECTION_STATE.running);
      try {
        const result = landmarker.detect(image);
        setState(DETECTION_STATE.ready);
        return result?.faceLandmarks?.[0] ?? null;
      } catch (cause) {
        setState(DETECTION_STATE.failed);
        setError(cause instanceof Error ? cause.message : String(cause));
        return null;
      }
    },
    [load]
  );

  return { state, error, detect, load };
}
