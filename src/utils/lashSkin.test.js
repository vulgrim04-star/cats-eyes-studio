import { describe, expect, it } from 'vitest';
import {
  SKIN_TONES,
  SKIN_VIGNETTE,
  SKIN_ZONES_CLOSED,
  SKIN_ZONES_OPEN,
  mirrorZone,
  skinZones,
} from './lashSkin';
import { VIEWBOX } from './lashGeometry';

const TOUS = [...SKIN_ZONES_OPEN, ...SKIN_ZONES_CLOSED];

describe('zones de modelé', () => {
  it('rend des ellipses exploitables, dans les deux jeux', () => {
    TOUS.forEach((zone) => {
      expect(typeof zone.id).toBe('string');
      expect(zone.rx).toBeGreaterThan(0);
      expect(zone.ry).toBeGreaterThan(0);
      expect(Number.isFinite(zone.cx)).toBe(true);
      expect(Number.isFinite(zone.cy)).toBe(true);
    });
  });

  // Deux zones du même identifiant s'écraseraient à l'écran sans que rien ne le signale :
  // on verrait seulement un modelé plus faible que prévu.
  it('ne nomme jamais deux fois la même zone dans un jeu', () => {
    [SKIN_ZONES_OPEN, SKIN_ZONES_CLOSED].forEach((jeu) => {
      const ids = jeu.map((z) => z.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // Les deux dégradés partagés sont les seuls remplissages disponibles : un ton inconnu
  // donnerait une ellipse sans fond, donc invisible.
  it('n’emploie que les deux tons définis', () => {
    TOUS.forEach((zone) => expect(SKIN_TONES).toContain(zone.tone));
  });

  // La peau doit ASSEOIR la frange, jamais lui disputer l'attention. Une zone à pleine
  // opacité ferait un aplat de maquillage.
  it('reste discrète : jamais d’aplat', () => {
    TOUS.forEach((zone) => {
      expect(zone.opacity).toBeGreaterThan(0);
      expect(zone.opacity).toBeLessThan(0.7);
    });
  });

  it('donne au visage ses deux registres, ombre et lumière', () => {
    [SKIN_ZONES_OPEN, SKIN_ZONES_CLOSED].forEach((jeu) => {
      expect(jeu.some((z) => z.tone === 'light')).toBe(true);
      expect(jeu.some((z) => z.tone === 'shade')).toBe(true);
    });
  });
});

describe('retournement', () => {
  // L'ERREUR QUI NE SE VERRAIT PAS : une racine de nez posée du mauvais côté ombre la tempe.
  // Le dessin s'affiche normalement, mais le visage se lit de travers.
  it('renvoie la racine du nez de l’autre côté du cadre', () => {
    const nez = SKIN_ZONES_OPEN.find((z) => z.id === 'noseBridge');
    expect(nez.cx).toBeLessThan(VIEWBOX.width / 2);
    expect(mirrorZone(nez).cx).toBeGreaterThan(VIEWBOX.width / 2);
  });

  it('inverse aussi l’inclinaison, pas seulement la position', () => {
    expect(mirrorZone({ cx: 100, angle: 12 })).toMatchObject({ cx: VIEWBOX.width - 100, angle: -12 });
    // Une zone droite reste droite, et sans `-0` qui traînerait dans le SVG.
    expect(mirrorZone({ cx: 100 }).angle).toBe(0);
  });

  it('est sa propre réciproque', () => {
    TOUS.forEach((zone) => expect(mirrorZone(mirrorZone(zone))).toEqual({ ...zone, angle: zone.angle ?? 0 }));
  });

  it('ne touche pas au jeu d’origine', () => {
    const copie = JSON.parse(JSON.stringify(SKIN_ZONES_OPEN));
    skinZones(SKIN_ZONES_OPEN, true);
    expect(SKIN_ZONES_OPEN).toEqual(copie);
  });

  it('rend le jeu tel quel quand on ne retourne pas', () => {
    expect(skinZones(SKIN_ZONES_CLOSED, false)).toBe(SKIN_ZONES_CLOSED);
  });
});

describe('champ de peau', () => {
  // Sans fondu vers le papier, on aurait un rectangle de peau en travers de la planche.
  it('couvre le cadre et se dissout avant son bord', () => {
    expect(SKIN_VIGNETTE.r).toBeGreaterThan(VIEWBOX.width / 2);
    expect(SKIN_VIGNETTE.solid).toBeGreaterThan(0);
    expect(SKIN_VIGNETTE.solid).toBeLessThan(1);
  });

  it('est centré horizontalement, donc insensible au retournement', () => {
    expect(SKIN_VIGNETTE.cx).toBe(VIEWBOX.width / 2);
  });
});
