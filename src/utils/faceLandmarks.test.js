import { describe, expect, it } from 'vitest';
import {
  LM,
  browBoxes,
  eyeCorners,
  hasEyeCorners,
  browHeights,
  estimateFaceShape,
  isUsable,
  overlayFromLandmarks,
} from './faceLandmarks';
import { FACE_SHAPES } from './browAdvisor';

/** Fabrique un jeu de 478 repères pour un visage synthétique.
 *  `height` et `jaw` sont donnés en fraction de la largeur des pommettes. */
function face({ height = 1.38, jaw = 0.88, forehead = 0.92, browGap = 0.02, browY = 0.3 } = {}) {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const set = (i, x, y) => { points[i] = { x, y }; };
  const cx = 0.5;
  const halfCheek = 0.18;

  set(LM.cheekLeft, cx - halfCheek, 0.5);
  set(LM.cheekRight, cx + halfCheek, 0.5);
  set(LM.faceTop, cx, 0.5 - (height * halfCheek));
  set(LM.chin, cx, 0.5 + (height * halfCheek));
  set(LM.jawLeft, cx - halfCheek * jaw, 0.66);
  set(LM.jawRight, cx + halfCheek * jaw, 0.66);
  set(LM.foreheadLeft, cx - halfCheek * forehead, 0.34);
  set(LM.foreheadRight, cx + halfCheek * forehead, 0.34);

  // Sourcil gauche de l'image : de la queue (extérieur) vers la tête (centre).
  LM.browLeft.forEach((i, k) => set(i, cx - 0.16 + k * 0.025, browY + browGap));
  LM.browRight.forEach((i, k) => set(i, cx + 0.16 - k * 0.025, browY));
  return points;
}

describe('isUsable', () => {
  it('accepte un jeu complet', () => {
    expect(isUsable(face())).toBe(true);
  });

  // Un tableau incomplet doit être refusé net, pas produire des mesures inventées.
  it('refuse ce qui n’est pas exploitable', () => {
    expect(isUsable(null)).toBe(false);
    expect(isUsable([])).toBe(false);
    expect(isUsable(Array.from({ length: 100 }, () => ({ x: 0, y: 0 })))).toBe(false);
    const troue = face();
    troue[LM.chin] = { x: NaN, y: 0.5 };
    expect(isUsable(troue)).toBe(false);
  });
});

describe('browBoxes', () => {
  it('place un sourcil de chaque côté du centre', () => {
    const b = browBoxes(face());
    expect(b.left.x).toBeLessThan(0.5);
    expect(b.right.x).toBeGreaterThan(0.5);
    expect(b.left.width).toBeGreaterThan(0);
  });

  it('se tait sur des repères inexploitables', () => {
    expect(browBoxes(null)).toBeNull();
  });
});

describe('estimateFaceShape', () => {
  it('reconnaît un visage allongé', () => {
    expect(estimateFaceShape(face({ height: 1.75 })).id).toBe('long');
  });

  it('reconnaît un visage rond', () => {
    expect(estimateFaceShape(face({ height: 1.12, jaw: 0.9 })).id).toBe('round');
  });

  it('reconnaît une mâchoire carrée', () => {
    expect(estimateFaceShape(face({ height: 1.25, jaw: 1.0 })).id).toBe('square');
  });

  it('ne rend jamais qu’une morphologie que le conseiller sait traiter', () => {
    const connues = FACE_SHAPES.map((f) => f.id);
    [1.0, 1.15, 1.3, 1.45, 1.6, 1.8].forEach((height) =>
      [0.72, 0.85, 0.95, 1.05].forEach((jaw) => {
        const r = estimateFaceShape(face({ height, jaw }));
        expect(connues, `h=${height} j=${jaw} → ${r.id}`).toContain(r.id);
      })
    );
  });

  // Un visage à mi-chemin entre deux familles ne doit pas être annoncé avec l'aplomb d'un
  // cas d'école : c'est ce que dit la confiance.
  it('rend une confiance plus haute sur un cas net que sur un cas limite', () => {
    const net = estimateFaceShape(face({ height: 1.75 }));
    const limite = estimateFaceShape(face({ height: 1.3, jaw: 0.95 }));
    expect(net.confidence).toBeGreaterThan(limite.confidence);
    expect(net.confidence).toBeLessThanOrEqual(1);
  });

  it('rend aussi les rapports mesurés, pour qu’on puisse les contredire', () => {
    const r = estimateFaceShape(face({ height: 1.5 }));
    expect(r.ratios.elongation).toBeCloseTo(1.5, 1);
  });

  it('se tait sur des repères inexploitables', () => {
    expect(estimateFaceShape([])).toBeNull();
  });
});

describe('browHeights', () => {
  it('mesure l’écart de hauteur entre les deux sourcils', () => {
    const h = browHeights(face({ browGap: 0.03 }));
    expect(h.leftY).toBeGreaterThan(h.rightY);
    expect(h.span).toBeGreaterThan(0);
  });

  it('ne signale aucun écart sur un visage symétrique', () => {
    const h = browHeights(face({ browGap: 0 }));
    expect(h.leftY).toBeCloseTo(h.rightY, 6);
  });
});

describe('overlayFromLandmarks', () => {
  it('centre le tracé entre les deux sourcils, en pourcentages', () => {
    const o = overlayFromLandmarks(face());
    expect(o.x).toBeGreaterThan(40);
    expect(o.x).toBeLessThan(60);
    expect(o.y).toBeGreaterThan(0);
    expect(o.y).toBeLessThan(100);
  });

  // Le réglage part directement dans `lashOverlay`, qui borne l'échelle à 10–200.
  it('rend une échelle toujours exploitable', () => {
    [1, 2.35, 8].forEach((coverage) => {
      const o = overlayFromLandmarks(face(), coverage);
      expect(o.scale).toBeGreaterThanOrEqual(10);
      expect(o.scale).toBeLessThanOrEqual(200);
    });
  });

  it('suit le visage quand les sourcils se déplacent', () => {
    expect(overlayFromLandmarks(face({ browY: 0.2 })).y).toBeLessThan(overlayFromLandmarks(face({ browY: 0.4 })).y);
  });

  it('se tait sur des repères inexploitables', () => {
    expect(overlayFromLandmarks(null)).toBeNull();
  });
});

describe('eyeCorners', () => {
  /** Le visage de référence n'a pas d'yeux : on les pose ici, à leur place réelle —
   *  l'externe vers la tempe, l'interne vers le nez. */
  function withEyes(base = face()) {
    const points = [...base];
    points[LM.eyeLeftOuter] = { x: 0.32, y: 0.42 };
    points[LM.eyeLeftInner] = { x: 0.44, y: 0.42 };
    points[LM.eyeRightInner] = { x: 0.56, y: 0.42 };
    points[LM.eyeRightOuter] = { x: 0.68, y: 0.42 };
    return points;
  }

  // Nommés par leur RÔLE et non par leur position : c'est ce qui permet de faire
  // correspondre interne à interne sans se demander de quel côté de l'image on est.
  it('place l’interne vers le nez sur les deux côtés', () => {
    const points = withEyes();
    expect(eyeCorners(points, 'left').inner.x).toBeGreaterThan(eyeCorners(points, 'left').outer.x);
    expect(eyeCorners(points, 'right').inner.x).toBeLessThan(eyeCorners(points, 'right').outer.x);
  });

  it('mesure la largeur de l’œil', () => {
    expect(eyeCorners(withEyes(), 'left').width).toBeCloseTo(0.12, 3);
  });

  // Un profil, un visage coupé par le bord du cadre : poser une frange sur un œil de
  // largeur nulle demanderait une échelle infinie.
  it('refuse deux coins confondus', () => {
    const points = withEyes();
    points[LM.eyeLeftInner] = { ...points[LM.eyeLeftOuter] };
    expect(eyeCorners(points, 'left')).toBeNull();
    expect(hasEyeCorners(points)).toBe(false);
  });

  it('accepte un visage complet, refuse des repères inexploitables', () => {
    expect(hasEyeCorners(withEyes())).toBe(true);
    expect(hasEyeCorners(null)).toBe(false);
    expect(eyeCorners(null, 'left')).toBeNull();
  });
});
