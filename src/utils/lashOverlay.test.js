import { describe, expect, it } from 'vitest';
import {
  OVERLAY_DEFAULT,
  isEmbeddable,
  normalizeOverlay,
  overlayStyle,
  wipeClip,
  wipeFromPointer,
} from './lashOverlay';

describe('normalizeOverlay', () => {
  it('complète un réglage absent', () => {
    expect(normalizeOverlay(undefined)).toEqual(OVERLAY_DEFAULT);
    expect(normalizeOverlay({})).toEqual(OVERLAY_DEFAULT);
  });

  // Le tracé doit rester récupérable à l'écran, même après une saisie malheureuse ou une
  // fiche enregistrée par une version antérieure.
  it('ramène toute valeur hors bornes dans une plage exploitable', () => {
    const r = normalizeOverlay({ x: 900, y: -40, scale: 1000, opacity: 0, wipe: 250 });
    expect(r.x).toBe(100);
    expect(r.y).toBe(0);
    expect(r.scale).toBe(200);
    expect(r.opacity).toBe(10);
    expect(r.wipe).toBe(100);
  });

  it('accepte une valeur écrite en texte et arrondit au dixième', () => {
    expect(normalizeOverlay({ scale: '62.48' }).scale).toBe(62.5);
  });

  it('retombe sur le défaut plutôt que sur NaN', () => {
    expect(normalizeOverlay({ x: 'abc', scale: null }).x).toBe(OVERLAY_DEFAULT.x);
    expect(normalizeOverlay({ scale: null }).scale).toBe(OVERLAY_DEFAULT.scale);
  });

  it('ne modifie pas le réglage fourni', () => {
    const source = { x: 900 };
    normalizeOverlay(source);
    expect(source).toEqual({ x: 900 });
  });
});

describe('overlayStyle', () => {
  // Sans le recentrage, déplacer le calque le ferait pivoter autour de son coin — invisable
  // au doigt sur un téléphone.
  it('centre le tracé sur le point choisi', () => {
    const s = overlayStyle({ x: 40, y: 60, scale: 50, opacity: 80 }, 0.8);
    expect(s.left).toBe('40%');
    expect(s.top).toBe('60%');
    expect(s.transform).toBe('translate(-50%, -50%)');
    expect(s.opacity).toBe(0.8);
  });

  it('tient le tracé à ses proportions, quelle que soit l’échelle', () => {
    expect(overlayStyle({ scale: 70 }, 0.8).aspectRatio).toBe('1 / 0.8');
  });

  it('supporte un ratio absurde sans produire de style cassé', () => {
    expect(overlayStyle({}, 0).aspectRatio).toBe('1 / 0.8');
    expect(overlayStyle({}, NaN).aspectRatio).toBe('1 / 0.8');
  });

  it('n’intercepte jamais le pointeur : la photo reste manipulable dessous', () => {
    expect(overlayStyle({}, 0.8).pointerEvents).toBe('none');
  });
});

describe('wipeClip', () => {
  it('masque ce qui est à gauche du volet', () => {
    expect(wipeClip({ wipe: 30 })).toBe('inset(0 0 0 30%)');
    expect(wipeClip({ wipe: 0 })).toBe('inset(0 0 0 0%)');
    expect(wipeClip({ wipe: 100 })).toBe('inset(0 0 0 100%)');
  });
});

describe('wipeFromPointer', () => {
  const rect = { left: 100, width: 400 };

  it('convertit une position de pointeur en pourcentage', () => {
    expect(wipeFromPointer(100, rect)).toBe(0);
    expect(wipeFromPointer(300, rect)).toBe(50);
    expect(wipeFromPointer(500, rect)).toBe(100);
  });

  it('borne un glissé sorti du cadre', () => {
    expect(wipeFromPointer(-999, rect)).toBe(0);
    expect(wipeFromPointer(9999, rect)).toBe(100);
  });

  it('supporte un cadre non mesuré', () => {
    expect(wipeFromPointer(300, null)).toBe(OVERLAY_DEFAULT.wipe);
    expect(wipeFromPointer(300, { left: 0, width: 0 })).toBe(OVERLAY_DEFAULT.wipe);
  });
});

describe('isEmbeddable', () => {
  // Une URL distante disparaîtrait des exports sans le moindre message : la rastérisation
  // charge le SVG comme une image, et n'y résout aucune ressource extérieure.
  it('n’accepte qu’une data URL', () => {
    expect(isEmbeddable('data:image/png;base64,AAA')).toBe(true);
    expect(isEmbeddable('https://exemple.test/photo.jpg')).toBe(false);
    expect(isEmbeddable('')).toBe(false);
    expect(isEmbeddable(undefined)).toBe(false);
  });
});
