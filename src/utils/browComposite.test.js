import { describe, expect, it } from 'vitest';
import {
  applyTransform,
  browFrame,
  browFramePx,
  browPolygon,
  centroid,
  dilatePolygon,
  eraseZone,
  eyeRegion,
  hasBrowOutline,
  polygonBounds,
  similarityTransform,
  skinProbes,
} from './browComposite';
import { LM } from './faceLandmarks';

/**
 * Visage synthétique à 478 repères.
 *
 * `tilt` incline les DEUX arcades du même angle, comme une tête penchée ; `browThickness`
 * donne l'écart entre les deux arêtes. Les yeux sont placés SOUS les sourcils, ce qui rend
 * vérifiable la promesse la plus importante du fichier : aucune sonde de peau ne doit y
 * tomber.
 */
function face({ tilt = 0, browThickness = 0.03, browY = 0.34 } = {}) {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const set = (i, x, y) => { points[i] = { x, y }; };
  const cx = 0.5;

  set(LM.cheekLeft, cx - 0.18, 0.5);
  set(LM.cheekRight, cx + 0.18, 0.5);
  set(LM.faceTop, cx, 0.5 - 0.25);
  set(LM.chin, cx, 0.5 + 0.25);
  set(LM.jawLeft, cx - 0.16, 0.66);
  set(LM.jawRight, cx + 0.16, 0.66);
  set(LM.foreheadLeft, cx - 0.17, 0.3);
  set(LM.foreheadRight, cx + 0.17, 0.3);

  // Arcade gauche de l'image : la queue (indice 0) est vers l'extérieur, la tête vers le nez.
  const place = (indices, x0, dx, dy) =>
    indices.forEach((i, k) => set(i, x0 + dx * k, browY + dy + tilt * (dx * k)));

  place(LM.browLeft, cx - 0.17, 0.028, 0);
  place(LM.browLeftLower, cx - 0.058, -0.028, browThickness);
  place(LM.browRight, cx + 0.17, -0.028, 0);
  place(LM.browRightLower, cx + 0.058, 0.028, browThickness);

  // Les yeux, franchement sous les sourcils.
  set(LM.eyeLeftOuter, cx - 0.17, browY + 0.1);
  set(LM.eyeLeftInner, cx - 0.06, browY + 0.1);
  set(LM.eyeRightInner, cx + 0.06, browY + 0.1);
  set(LM.eyeRightOuter, cx + 0.17, browY + 0.1);
  return points;
}

describe('hasBrowOutline', () => {
  it('accepte un jeu complet', () => {
    expect(hasBrowOutline(face())).toBe(true);
  });

  // Un modèle plus ancien, ou un tableau tronqué, n'a pas l'arête inférieure : mieux vaut
  // le dire et retomber sur le calque à plat que composer sur une surface inventée.
  it('refuse un jeu sans arête inférieure', () => {
    const points = face();
    points[LM.browLeftLower[2]] = { x: NaN, y: 0.3 };
    expect(hasBrowOutline(points)).toBe(false);
    expect(browPolygon(points, 'left')).toBeNull();
    expect(browFrame(points, 'left')).toBeNull();
  });

  it('refuse un jeu trop court', () => {
    expect(hasBrowOutline(Array.from({ length: 100 }, () => ({ x: 0, y: 0 })))).toBe(false);
  });
});

describe('browPolygon', () => {
  it('rend un contour de dix points pour chaque côté', () => {
    expect(browPolygon(face(), 'left')).toHaveLength(10);
    expect(browPolygon(face(), 'right')).toHaveLength(10);
  });

  // La condition pour qu'un remplissage donne la SURFACE du sourcil et non un nœud. Un
  // contour croisé en huit a une aire signée quasi nulle, les deux boucles s'annulant : on
  // vérifie donc que l'aire vaut bien celle d'un sourcil, longueur × épaisseur.
  it('se referme sans se croiser', () => {
    ['left', 'right'].forEach((side) => {
      const polygon = browPolygon(face(), side);
      const frame = browFrame(face(), side);
      const aire = Math.abs(
        polygon.reduce((sum, p, i) => {
          const q = polygon[(i + 1) % polygon.length];
          return sum + (p.x * q.y - q.x * p.y);
        }, 0) / 2
      );
      expect(aire).toBeGreaterThan(frame.length * frame.thickness * 0.5);
    });
  });

  it('sépare bien les deux côtés de l’image', () => {
    const gauche = polygonBounds(browPolygon(face(), 'left'));
    const droite = polygonBounds(browPolygon(face(), 'right'));
    expect(gauche.maxX).toBeLessThan(droite.minX);
  });
});

describe('browFrame', () => {
  it('place la tête vers le nez et la queue vers la tempe', () => {
    const gauche = browFrame(face(), 'left');
    const droite = browFrame(face(), 'right');
    // Sur l'arcade gauche de l'image, la tête est la plus à DROITE des deux.
    expect(gauche.head.x).toBeGreaterThan(gauche.tail.x);
    expect(droite.head.x).toBeLessThan(droite.tail.x);
  });

  it('mesure une longueur et une épaisseur cohérentes', () => {
    const frame = browFrame(face({ browThickness: 0.03 }), 'left');
    expect(frame.length).toBeCloseTo(0.112, 2);
    expect(frame.thickness).toBeCloseTo(0.03, 2);
    // Un sourcil est bien plus long qu'épais : le contraire signalerait des arêtes
    // interverties.
    expect(frame.length).toBeGreaterThan(frame.thickness * 2);
  });

  // Le défaut central de l'ancienne simulation : les deux sourcils posés d'un bloc, alors
  // qu'une tête penchée les incline tous les deux.
  // On mesure l'écart à l'horizontale par |sin| et non par |angle| : l'axe de l'arcade
  // gauche va vers les x décroissants, son angle vaut donc π à plat — ce qui est correct,
  // et ce qui a précisément fait retourner la normale des sondes dans le mauvais sens.
  it('suit l’inclinaison de l’arcade', () => {
    ['left', 'right'].forEach((side) => {
      const droit = browFrame(face({ tilt: 0 }), side);
      const penche = browFrame(face({ tilt: 0.5 }), side);
      expect(Math.abs(Math.sin(droit.angle))).toBeLessThan(0.01);
      expect(Math.abs(Math.sin(penche.angle))).toBeGreaterThan(0.4);
    });
  });

  it('donne aux deux côtés des angles opposés sur une tête penchée', () => {
    const gauche = browFrame(face({ tilt: 0.5 }), 'left');
    const droite = browFrame(face({ tilt: 0.5 }), 'right');
    // Mesurés tête → queue, les deux axes divergent : leurs angles ne sont pas égaux.
    expect(Math.abs(gauche.angle - droite.angle)).toBeGreaterThan(0.5);
  });
});

describe('dilatePolygon', () => {
  it('écarte chaque sommet du centre de la marge demandée', () => {
    const polygon = browPolygon(face(), 'left');
    const c = centroid(polygon);
    const grossi = dilatePolygon(polygon, 0.01);
    polygon.forEach((p, i) => {
      const avant = Math.hypot(p.x - c.x, p.y - c.y);
      const apres = Math.hypot(grossi[i].x - c.x, grossi[i].y - c.y);
      expect(apres - avant).toBeCloseTo(0.01, 6);
    });
  });

  it('englobe strictement le contour d’origine', () => {
    const polygon = browPolygon(face(), 'left');
    const avant = polygonBounds(polygon);
    const apres = polygonBounds(dilatePolygon(polygon, 0.01));
    expect(apres.minX).toBeLessThan(avant.minX);
    expect(apres.maxX).toBeGreaterThan(avant.maxX);
    expect(apres.minY).toBeLessThan(avant.minY);
    expect(apres.maxY).toBeGreaterThan(avant.maxY);
  });

  // Un sommet confondu avec le centre n'a pas de direction : il ne doit pas partir à NaN.
  it('ne divise pas par zéro sur un sommet confondu avec le centre', () => {
    const carre = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0.5, y: 0.5 }];
    dilatePolygon(carre, 0.1).forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });
});

describe('skinProbes', () => {
  const points = face();

  it('rend six sondes', () => {
    expect(skinProbes(browFrame(points, 'left'))).toHaveLength(6);
  });

  /** Côté de l'axe du sourcil où se trouve un point, en signe. Écrit sans reprendre le
   *  calcul de normale du module : un test qui copierait l'implémentation validerait le
   *  bogue au lieu de l'attraper. */
  const sideOfAxis = (frame, p) => {
    const nx = -Math.sin(frame.angle);
    const ny = Math.cos(frame.angle);
    return Math.sign((p.x - frame.head.x) * nx + (p.y - frame.head.y) * ny);
  };

  // LA garantie du fichier, et le bogue qu'elle a réellement attrapé : sur l'arcade gauche,
  // l'axe pointe vers les x décroissants, et la normale calculée descendait droit dans la
  // paupière. Une sonde tombée dans un cil peint une tache sombre au milieu du front.
  const eyeOf = (side) => points[side === 'left' ? LM.eyeLeftOuter : LM.eyeRightOuter];

  it('place toutes les sondes du côté opposé à l’œil', () => {
    ['left', 'right'].forEach((side) => {
      const frame = browFrame(points, side);
      const coteOeil = sideOfAxis(frame, eyeOf(side));
      expect(coteOeil).not.toBe(0);
      skinProbes(frame).forEach((probe) => {
        expect(sideOfAxis(frame, probe)).toBe(-coteOeil);
      });
    });
  });

  it('reste du bon côté sur une tête penchée', () => {
    const penche = face({ tilt: 0.6 });
    ['left', 'right'].forEach((side) => {
      const frame = browFrame(penche, side);
      const oeil = penche[side === 'left' ? LM.eyeLeftOuter : LM.eyeRightOuter];
      const coteOeil = sideOfAxis(frame, oeil);
      skinProbes(frame).forEach((probe) => {
        expect(sideOfAxis(frame, probe)).toBe(-coteOeil);
      });
    });
  });

  it('sort du contour du sourcil, pour ne pas lire un poil', () => {
    ['left', 'right'].forEach((side) => {
      const frame = browFrame(points, side);
      const bounds = polygonBounds(browPolygon(points, side));
      skinProbes(frame).forEach((probe) => {
        const dedans = probe.x >= bounds.minX && probe.x <= bounds.maxX
          && probe.y >= bounds.minY && probe.y <= bounds.maxY;
        expect(dedans).toBe(false);
      });
    });
  });

  it('se répartit le long de l’arcade au lieu de se grouper', () => {
    const frame = browFrame(points, 'left');
    const sondes = skinProbes(frame);
    const xs = sondes.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(frame.length);
  });

  it('rend null sans repère', () => {
    expect(skinProbes(null)).toBeNull();
  });
});

describe('browFramePx', () => {
  const W = 700;
  const H = 900;

  // La raison d'être de cette seconde version : sur un portrait, une unité en x et une
  // unité en y ne mesurent pas la même chose. Une longueur qui ne serait pas convertie
  // déformerait toute forme inclinée qu'on construirait dessus.
  it('rend des distances en vrais pixels', () => {
    const px = browFramePx(face(), 'left', W, H);
    const frac = browFrame(face(), 'left');
    expect(px.length).toBeCloseTo(frac.length * W, 0);
    expect(px.thickness).toBeGreaterThan(frac.thickness * H * 0.8);
  });

  it('rend null sans repère exploitable', () => {
    expect(browFramePx(null, 'left', W, H)).toBeNull();
  });
});

describe('eraseZone', () => {
  const W = 700;
  const H = 900;
  const points = face();

  // LE correctif : l'anneau de repères serre le sourcil de trop près. La zone doit
  // l'englober entièrement, sans quoi la moitié basse du sourcil de la cliente survit à
  // l'effacement — une dalle sombre sous le nouveau tracé, exactement ce qu'on a mesuré.
  it('englobe tout le contour du sourcil', () => {
    ['left', 'right'].forEach((side) => {
      const zone = eraseZone(browFramePx(points, side, W, H));
      const bounds = polygonBounds(zone);
      browPolygon(points, side).forEach((p) => {
        expect(p.x * W).toBeGreaterThanOrEqual(bounds.minX - 0.5);
        expect(p.x * W).toBeLessThanOrEqual(bounds.maxX + 0.5);
        expect(p.y * H).toBeGreaterThanOrEqual(bounds.minY - 0.5);
        expect(p.y * H).toBeLessThanOrEqual(bounds.maxY + 0.5);
      });
    });
  });

  it('déborde le sourcil des deux côtés et aux deux bouts', () => {
    const frame = browFramePx(points, 'left', W, H);
    const zone = polygonBounds(eraseZone(frame));
    const brow = polygonBounds(browPolygon(points, 'left').map((p) => ({ x: p.x * W, y: p.y * H })));
    expect(zone.width).toBeGreaterThan(brow.width * 1.1);
    expect(zone.height).toBeGreaterThan(brow.height * 1.5);
  });

  // Au-delà commencent la paupière et les cils : les effacer ferait disparaître l'œil.
  it('ne descend jamais jusqu’à l’œil', () => {
    ['left', 'right'].forEach((side) => {
      const zone = eraseZone(browFramePx(points, side, W, H));
      const oeil = points[side === 'left' ? LM.eyeLeftOuter : LM.eyeRightOuter];
      expect(polygonBounds(zone).maxY).toBeLessThan(oeil.y * H);
    });
  });

  // Un anneau anormalement serré ne doit pas donner une zone trop mince pour servir : la
  // proportion d'un vrai sourcil prend alors le relais.
  it('impose une épaisseur minimale sur un contour trop serré', () => {
    const plat = face({ browThickness: 0.001 });
    const zone = polygonBounds(eraseZone(browFramePx(plat, 'left', W, H)));
    const frame = browFramePx(plat, 'left', W, H);
    expect(zone.height).toBeGreaterThan(frame.length * 0.16);
  });

  it('suit l’inclinaison de l’arcade', () => {
    const penche = face({ tilt: 0.6 });
    const zone = eraseZone(browFramePx(penche, 'left', W, H));
    // Les deux sommets du haut ne sont pas à la même hauteur : la zone est inclinée.
    expect(Math.abs(zone[0].y - zone[1].y)).toBeGreaterThan(20);
  });

  it('rend null sans repère', () => {
    expect(eraseZone(null)).toBeNull();
  });
});

describe('similarityTransform', () => {
  const A = { x: 0, y: 0 };
  const B = { x: 10, y: 0 };

  // La promesse : la tête du dessin tombe sur la tête réelle, la queue sur la queue.
  it('amène exactement le segment source sur le segment cible', () => {
    const destA = { x: 3, y: 7 };
    const destB = { x: 8, y: 11 };
    const t = similarityTransform(A, B, destA, destB);
    expect(applyTransform(t, A).x).toBeCloseTo(destA.x, 9);
    expect(applyTransform(t, A).y).toBeCloseTo(destA.y, 9);
    expect(applyTransform(t, B).x).toBeCloseTo(destB.x, 9);
    expect(applyTransform(t, B).y).toBeCloseTo(destB.y, 9);
  });

  it('reste une similitude : échelle uniforme, pas d’étirement', () => {
    const t = similarityTransform(A, B, { x: 0, y: 0 }, { x: 0, y: 20 });
    expect(t.scale).toBeCloseTo(2, 9);
    // Un point à angle droit de la source doit rester à angle droit et à la même échelle.
    const p = applyTransform(t, { x: 0, y: 5 });
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(10, 9);
  });

  it('conserve la longueur et l’angle sur une correspondance identique', () => {
    const t = similarityTransform(A, B, A, B);
    expect(t.scale).toBeCloseTo(1, 9);
    expect(t.angle).toBeCloseTo(0, 9);
  });

  it('refuse un segment source de longueur nulle', () => {
    expect(similarityTransform(A, A, { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull();
    expect(similarityTransform(null, B, A, B)).toBeNull();
  });
});

describe('eyeRegion', () => {
  it('englobe les deux sourcils et les deux yeux', () => {
    const points = face();
    const region = eyeRegion(points);
    const gauche = polygonBounds(browPolygon(points, 'left'));
    const droite = polygonBounds(browPolygon(points, 'right'));
    expect(region.x).toBeLessThan(gauche.minX);
    expect(region.x + region.width).toBeGreaterThan(droite.maxX);
    // Les yeux sont sous les sourcils : le cadre doit descendre jusqu'à eux.
    expect(region.y + region.height).toBeGreaterThan(points[LM.eyeLeftOuter].y);
  });

  it('ne sort jamais de l’image', () => {
    const region = eyeRegion(face(), 3);
    expect(region.x).toBeGreaterThanOrEqual(0);
    expect(region.y).toBeGreaterThanOrEqual(0);
    expect(region.x + region.width).toBeLessThanOrEqual(1);
    expect(region.y + region.height).toBeLessThanOrEqual(1);
  });

  it('rend null sans contour exploitable', () => {
    expect(eyeRegion(null)).toBeNull();
  });
});
