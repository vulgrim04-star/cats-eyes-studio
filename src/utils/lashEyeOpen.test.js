import { describe, expect, it } from 'vitest';
import {
  OPEN_GRADIENT_BOUNDS,
  buildLowerLashes,
  irisFibres,
  lashShadowBands,
  openGlobeSheen,
  lowerLashDirection,
  lowerLidPoint,
  openEyeIris,
  openEyePaths,
  openLashFrame,
  upperLashDirection,
  upperLidPoint,
} from './lashEyeOpen';
import { VIEWBOX, buildExtensionLashes, buildSectors } from './lashGeometry';

const samples = (n = 11) => Array.from({ length: n }, (_, i) => i / (n - 1));

/** Sommet de la paupière supérieure : le point le plus haut, et où il tombe. */
function apex() {
  return samples(401).reduce(
    (best, t) => {
      const p = upperLidPoint(t);
      return p.y < best.y ? { t, ...p } : best;
    },
    { t: 0, ...upperLidPoint(0) }
  );
}

/** Étendue de l'ouverture : sa largeur, sa hauteur maximale, et la position du sommet
 *  exprimée en FRACTION DE LA LARGEUR — et non du paramètre `t`, qui n'y est pas
 *  proportionnel sur une cubique et donnerait une mesure fausse. */
function aperture() {
  const inner = upperLidPoint(0);
  const outer = upperLidPoint(1);
  const width = outer.x - inner.x;
  const height = Math.max(...samples(401).map((t) => lowerLidPoint(t).y - upperLidPoint(t).y));
  return { width, height, apexShare: (apex().x - inner.x) / width };
}

describe('contour de l’œil ouvert', () => {
  it('ouvre bien un œil : la paupière haute est au-dessus de la basse partout entre les coins', () => {
    samples().slice(1, -1).forEach((t) => {
      expect(upperLidPoint(t).y).toBeLessThan(lowerLidPoint(t).y);
    });
  });

  // Sans cette jonction, le blanc de l'œil fuirait par les deux bouts et le contour ne
  // fermerait pas — la découpe de l'iris n'aurait alors plus de bord.
  it('referme les deux paupières exactement aux coins', () => {
    [0, 1].forEach((t) => {
      expect(upperLidPoint(t)).toEqual(lowerLidPoint(t));
    });
  });

  it('tient dans le cadre de la planche', () => {
    samples(21).forEach((t) => {
      [upperLidPoint(t), lowerLidPoint(t)].forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(VIEWBOX.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(VIEWBOX.height);
      });
    });
  });

  it('rend des tracés SVG exploitables dans les deux orientations', () => {
    [false, true].forEach((mirrored) => {
      Object.values(openEyePaths(mirrored)).forEach((d) => {
        expect(typeof d).toBe('string');
        expect(d.startsWith('M')).toBe(true);
        expect(d).not.toMatch(/NaN|undefined/);
      });
    });
  });

  // Les surfaces se remplissent : un tracé ouvert se refermerait de lui-même par une
  // droite, et l'ombre de paupière déborderait sur le sourcil.
  it('ferme les tracés qui sont des surfaces', () => {
    const paths = openEyePaths();
    ['aperture', 'ridge', 'socket', 'caruncle'].forEach((key) =>
      expect(paths[key].endsWith('Z')).toBe(true)
    );
    ['upperLid', 'lowerLid', 'crease', 'waterline'].forEach((key) =>
      expect(paths[key].endsWith('Z')).toBe(false)
    );
  });
});

describe('cils de l’œil ouvert', () => {
  // Tout le sens de la bascule : sur la planche les cils descendent, ici ils remontent.
  it('fait monter les cils du haut et descendre ceux du bas', () => {
    samples().forEach((t) => {
      expect(upperLashDirection(t).y).toBeLessThan(0);
      expect(lowerLashDirection(t).y).toBeGreaterThan(0);
    });
  });

  it('les évase vers l’extérieur à mesure qu’on s’éloigne du centre', () => {
    expect(upperLashDirection(0.05).x).toBeLessThan(upperLashDirection(0.3).x);
    expect(upperLashDirection(0.95).x).toBeGreaterThan(upperLashDirection(0.7).x);
  });

  // La verticale ne tombe plus au milieu du paramètre : sur une amande, elle tombe au
  // SOMMET de la paupière, qui est dans le tiers interne. C'est exactement la différence
  // entre la lentille d'avant et l'œil d'aujourd'hui.
  it('ne dresse les cils à la verticale qu’au sommet de la paupière', () => {
    expect(Math.abs(upperLashDirection(apex().t).x)).toBeLessThan(0.14);
  });

  // CE QUE LA NORMALE APPORTE, exactement : les cils suivent la PENTE de la paupière. Là où
  // elle est raide, ils se couchent ; là où elle s'aplatit, ils se dressent. Le seul foyer
  // l'ignorait — il donnait le même éventail quelle que soit la courbe en dessous, ce qui
  // passait inaperçu sur une lentille symétrique et ne passe plus sur une amande.
  //
  // Attention à ce que ce test NE dit PAS : que le coin externe s'évase plus que l'interne.
  // C'est faux au sens de l'angle — la paupière est plus raide côté interne, donc les cils y
  // sont plus couchés. Ce qui donne son coup de fouet externe à la maquette, c'est la
  // LONGUEUR des cils à cet endroit, qui vient de la fiche, pas de la géométrie de l'œil.
  it('couche les cils là où la paupière est raide, les dresse là où elle s’aplatit', () => {
    const pente = (t) => {
      const avant = upperLidPoint(Math.max(0, t - 0.01));
      const apres = upperLidPoint(Math.min(1, t + 0.01));
      return Math.abs((apres.y - avant.y) / (apres.x - avant.x));
    };
    const couche = (t) => Math.abs(upperLashDirection(t).x);
    const sommet = apex().t;

    expect(pente(0.06)).toBeGreaterThan(pente(sommet));
    expect(couche(0.06)).toBeGreaterThan(couche(sommet));

    expect(pente(0.94)).toBeGreaterThan(pente(sommet));
    expect(couche(0.94)).toBeGreaterThan(couche(sommet));
  });

  // Les secteurs sont découpés une seule fois, en `t` croissant. Si `x` ne croissait pas
  // avec `t`, le coin interne d'un œil se dessinerait à la place du coin externe.
  it('garde x croissant avec t, œil retourné compris', () => {
    [false, true].forEach((mirrored) => {
      const frame = openLashFrame({ mirrored });
      const xs = samples(21).map((t) => frame.point(t).x);
      xs.slice(1).forEach((x, i) => expect(x).toBeGreaterThan(xs[i]));
    });
  });

  it('retourne le repère par réflexion, sans le déformer', () => {
    const droit = openLashFrame();
    const gauche = openLashFrame({ mirrored: true });
    samples().forEach((t) => {
      const a = droit.point(1 - t);
      const b = gauche.point(t);
      expect(b.x).toBeCloseTo(VIEWBOX.width - a.x, 6);
      expect(b.y).toBeCloseTo(a.y, 6);
      expect(gauche.direction(t).x).toBeCloseTo(-droit.direction(1 - t).x, 6);
      expect(gauche.direction(t).y).toBeCloseTo(droit.direction(1 - t).y, 6);
    });
  });
});

describe('branchement sur le moteur de cils', () => {
  const zones = Array.from({ length: 12 }, (_, i) => ({
    length: 8 + i * 0.4,
    curl: 'C',
    diameter: '0.07',
    density: 'Classic',
    style: 'Classique',
  }));

  // La vue ouverte ne redessine pas les cils : elle change le REPÈRE de pose. Ce test
  // vérifie le contrat entre les deux modules — le seul endroit où ils se parlent.
  it('produit des cils dont la pointe est au-dessus de la racine', () => {
    const sectors = buildSectors(zones.length);
    const lashes = buildExtensionLashes(zones, sectors, { frame: openLashFrame() });
    expect(lashes.length).toBeGreaterThan(50);
    lashes.forEach((lash) => {
      const [rootY, tipY] = pointsOf(lash.d);
      expect(tipY).toBeLessThan(rootY);
    });
  });

  it('les pose bien sur la ligne ciliaire du haut', () => {
    const sectors = buildSectors(zones.length);
    const lashes = buildExtensionLashes(zones, sectors, { frame: openLashFrame() });
    lashes.forEach((lash) => {
      const [rootY] = pointsOf(lash.d);
      // Tolérance : la racine est décalée d'une demi-épaisseur de cil de part et d'autre
      // de la ligne, le tracé étant une silhouette et non un trait.
      expect(Math.abs(rootY - nearestLidY(lash.d))).toBeLessThan(6);
    });
  });
});

/** Racine (premier point du tracé) et pointe (fin de la première quadratique). */
function pointsOf(d) {
  const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
  return [numbers[1], numbers[5]];
}

function nearestLidY(d) {
  const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const x = numbers[0];
  let best = Infinity;
  let bestY = 0;
  samples(201).forEach((t) => {
    const p = upperLidPoint(t);
    if (Math.abs(p.x - x) < best) {
      best = Math.abs(p.x - x);
      bestY = p.y;
    }
  });
  return bestY;
}

describe('iris', () => {
  it('déborde l’ouverture pour être rogné par les paupières', () => {
    const iris = openEyeIris();
    expect(iris.cy - iris.r).toBeLessThan(upperLidPoint(0.5).y);
    expect(iris.cy + iris.r).toBeGreaterThan(lowerLidPoint(0.5).y);
  });

  it('reste dans les bornes latérales de l’œil', () => {
    const iris = openEyeIris();
    expect(iris.cx - iris.r).toBeGreaterThan(upperLidPoint(0).x);
    expect(iris.cx + iris.r).toBeLessThan(upperLidPoint(1).x);
  });

  it('se déplace avec l’œil retourné', () => {
    expect(openEyeIris(true).cx).toBeCloseTo(VIEWBOX.width - openEyeIris().cx, 6);
  });

  // Une pièce n'a qu'une lampe : elle éclaire les deux yeux du même côté. Des reflets qui
  // basculeraient avec le dessin donneraient deux sources contradictoires — et
  // contrediraient le dégradé de l'iris, dont la lumière ne bascule pas non plus.
  it('garde ses reflets du même côté sur les deux yeux', () => {
    const droit = openEyeIris();
    const gauche = openEyeIris(true);
    droit.highlights.forEach((h, i) => {
      expect(gauche.highlights[i].x - gauche.cx).toBeCloseTo(h.x - droit.cx, 6);
      expect(gauche.highlights[i].y).toBeCloseTo(h.y, 6);
    });
  });

  it('garde la pupille à l’intérieur de l’iris', () => {
    const iris = openEyeIris();
    expect(iris.pupilR).toBeGreaterThan(0);
    expect(iris.pupilR).toBeLessThan(iris.r);
  });
});

describe('bornes de dégradé', () => {
  // Le piège exact que ces bornes évitent : reprendre celles de la planche fermée, où les
  // cils descendent, teindrait toute la frange ouverte d'un noir uni.
  it('va du bas sombre vers le haut clair, à l’inverse de la planche', () => {
    expect(OPEN_GRADIENT_BOUNDS.lash.y0).toBeGreaterThan(OPEN_GRADIENT_BOUNDS.lash.y1);
  });

  it('couvre réellement l’étendue des cils dessinés', () => {
    const sectors = buildSectors(12);
    const zones = Array.from({ length: 12 }, () => ({ length: 15, curl: 'D', diameter: '0.15' }));
    const lashes = buildExtensionLashes(zones, sectors, { frame: openLashFrame() });
    const tips = lashes.map((lash) => pointsOf(lash.d)[1]);
    expect(Math.min(...tips)).toBeGreaterThan(OPEN_GRADIENT_BOUNDS.lash.y1);
    expect(Math.max(...tips)).toBeLessThan(OPEN_GRADIENT_BOUNDS.lash.y0);
  });
});

describe('cils du bas', () => {
  it('rend le même dessin à graine égale', () => {
    expect(buildLowerLashes()).toEqual(buildLowerLashes());
  });

  it('respecte le nombre demandé et rend des tracés valides', () => {
    const lashes = buildLowerLashes({ count: 20 });
    expect(lashes).toHaveLength(20);
    lashes.forEach((lash) => {
      expect(lash.d.startsWith('M')).toBe(true);
      expect(lash.d).not.toMatch(/NaN/);
      expect(lash.opacity).toBeGreaterThan(0);
      expect(lash.opacity).toBeLessThanOrEqual(1);
    });
  });

  it('les dessine sous l’œil, jamais dedans', () => {
    buildLowerLashes().forEach((lash) => {
      const [rootY, tipY] = pointsOf(lash.d);
      expect(tipY).toBeGreaterThan(rootY);
    });
  });
});


describe('caroncule', () => {
  const start = (d) => {
    const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    return { x: n[0], y: n[1] };
  };

  it('se pose au coin interne, et le suit quand l’œil se retourne', () => {
    const droit = start(openEyePaths(false).caruncle);
    const gauche = start(openEyePaths(true).caruncle);
    expect(Math.hypot(droit.x - upperLidPoint(0).x, droit.y - upperLidPoint(0).y)).toBeLessThan(12);
    expect(gauche.x).toBeCloseTo(VIEWBOX.width - droit.x, 6);
  });
});

describe('fibres de l’iris', () => {
  it('reste entre la pupille et le limbe', () => {
    [false, true].forEach((mirrored) => {
      const iris = openEyeIris(mirrored);
      irisFibres({ mirrored }).forEach((fibre) => {
        const n = fibre.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
        [[n[0], n[1]], [n[2], n[3]]].forEach(([x, y]) => {
          const r = Math.hypot(x - iris.cx, y - iris.cy);
          expect(r).toBeGreaterThanOrEqual(iris.pupilR);
          expect(r).toBeLessThan(iris.r);
        });
      });
    });
  });

  it('rend le même tissu à graine égale', () => {
    expect(irisFibres()).toEqual(irisFibres());
  });

  it('mélange stries claires et sombres', () => {
    const fibres = irisFibres({ count: 60 });
    const claires = fibres.filter((f) => f.light).length;
    expect(claires).toBeGreaterThan(5);
    expect(claires).toBeLessThan(55);
  });
});


describe('éclat du globe', () => {
  it('se pose sur le blanc de l’œil et se retourne avec lui', () => {
    const droit = openGlobeSheen(false);
    const gauche = openGlobeSheen(true);
    expect(gauche.cx).toBeCloseTo(VIEWBOX.width - droit.cx, 6);
    // Hors de l'iris : posé dessus, ce serait un second reflet de plus, pas une lueur.
    expect(Math.abs(droit.cx - openEyeIris().cx)).toBeGreaterThan(openEyeIris().r);
  });
});


describe('l’amande', () => {
  // CE QUI A CHANGÉ, ET POURQUOI. L'ouverture était une lentille : un seul point de contrôle
  // par paupière, donc une courbe forcément symétrique dont le sommet tombait pile au milieu.
  // Aucun œil n'est fait ainsi, et c'était le premier écart avec la maquette.
  it('place son sommet dans le tiers interne, pas au milieu', () => {
    const share = aperture().apexShare;
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(0.45);
  });

  // Le relèvement du coin externe : sans lui, un Cat Eye ne se lit pas.
  it('relève le coin externe au-dessus de l’interne', () => {
    expect(upperLidPoint(1).y).toBeLessThan(upperLidPoint(0).y);
  });

  // En dessous l'œil s'arrondit et fait dessin animé, au-dessus il se ferme et fait masque.
  it('garde la proportion d’une amande', () => {
    const { width, height } = aperture();
    expect(width / height).toBeGreaterThan(2.6);
    expect(width / height).toBeLessThan(3.2);
  });

  // Un vrai œil a la paupière basse bien plus plate que la haute. Si les deux se creusaient
  // pareil, on retrouverait la lentille par un autre chemin.
  it('creuse moins la paupière basse que la haute', () => {
    const inner = upperLidPoint(0);
    const outer = upperLidPoint(1);
    const corde = (t) => inner.y + (outer.y - inner.y) * t;
    const fleche = (point) => Math.max(...samples(201).map((t) => Math.abs(point(t).y - corde(t))));
    expect(fleche(lowerLidPoint)).toBeLessThan(fleche(upperLidPoint) * 0.8);
  });
});

describe('ombre portée de la frange', () => {
  // LE DÉFAUT QUE CES BANDES REMPLACENT. L'ombre était un dégradé vertical : il s'éteignait à
  // la bonne hauteur au centre et restait opaque sur les côtés, où la paupière est plus
  // basse. On obtenait un coin gris à bord net en travers du blanc de l'œil — invisible en
  // relisant le code, évident à l'écran.
  // Chaque bande fait une MARCHE d'opacité. Trois bandes donnaient des marches de 4 %, et
  // 4 % d'encre sur un fond clair se voit comme un contour : on avait remplacé un coin gris
  // par trois. Sous 2 %, l'œil ne distingue plus la marche d'un dégradé.
  it('garde ses marches sous le seuil où elles se verraient', () => {
    lashShadowBands().forEach((bande) => expect(bande.opacity).toBeLessThan(0.02));
  });

  it('reste une ombre, jamais un bandeau', () => {
    const total = lashShadowBands().reduce((somme, b) => somme + b.opacity, 0);
    expect(total).toBeLessThan(0.3);
    expect(total).toBeGreaterThan(0.1);
  });

  // Resserrées près de la paupière, espacées en s'éloignant : une ombre ne s'éteint pas
  // linéairement.
  it('resserre les bandes près de la paupière', () => {
    const profondeur = (bande) => {
      const n = bande.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
      return n[n.length - 3];
    };
    const bandes = lashShadowBands();
    const premier = profondeur(bandes[1]) - profondeur(bandes[0]);
    const dernier = profondeur(bandes[bandes.length - 1]) - profondeur(bandes[bandes.length - 2]);
    expect(dernier).toBeGreaterThan(premier);
  });

  it('part bien de la ligne ciliaire, dans les deux orientations', () => {
    [false, true].forEach((mirrored) => {
      lashShadowBands(mirrored).forEach((bande) => {
        const debut = bande.d.match(/-?\d+(?:\.\d+)?/g).slice(0, 2).map(Number);
        // La bande part TOUJOURS du coin interne — c'est le premier point du tracé — et
        // c'est lui qu'on réfléchit, pas le coin externe.
        const coin = upperLidPoint(0);
        const attendu = mirrored ? { x: VIEWBOX.width - coin.x, y: coin.y } : coin;
        expect(debut[0]).toBeCloseTo(attendu.x, 1);
        expect(debut[1]).toBeCloseTo(attendu.y, 1);
      });
    });
  });
});
