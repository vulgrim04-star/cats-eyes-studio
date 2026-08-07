import { describe, expect, it } from 'vitest';
import {
  COVERAGE,
  curlShape,
  densityFactor,
  diameterWidth,
  interpolateAt,
  renderProfile,
  techniqueProfile,
} from './lashRender';
import { CURLS, DENSITIES, DIAMETERS, TECHNIQUES } from './lashReferentials';

// Une entrée manquante ne se verrait pas : le repli la masquerait, et un secteur en DD se
// dessinerait comme un C sans que rien ne le signale.
describe('couverture des référentiels', () => {
  it('connaît toutes les valeurs du modèle', () => {
    expect(COVERAGE).toEqual({ curls: true, diameters: true, densities: true, techniques: true });
  });
});

describe('curlShape', () => {
  // L'ordre du métier : J est la plus droite, M la plus recourbée. Si cet ordre se
  // renversait, un réglage donnerait l'inverse de ce qu'il annonce.
  it('classe les courbures de la plus droite à la plus recourbée', () => {
    const echelle = ['J', 'B', 'C', 'CC', 'D', 'DD'].map((c) => curlShape(c).bend);
    echelle.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(echelle[i]));
  });

  // La L n'est pas une D moins forte : elle reste DROITE puis se relève d'un coup, et
  // c'est ce qui la rend utile sur une paupière tombante.
  it('donne à la L un relèvement tardif, pas une simple amplitude', () => {
    expect(curlShape('L').curveRatio).toBeLessThan(curlShape('D').curveRatio - 0.1);
  });

  it('retombe sur la courbure la plus courante devant une valeur inconnue', () => {
    expect(curlShape('inventée')).toEqual(curlShape('C'));
    expect(curlShape(null)).toEqual(curlShape('C'));
  });

  it('rend toujours des nombres exploitables', () => {
    CURLS.forEach((c) => {
      expect(curlShape(c).bend).toBeGreaterThan(0);
      expect(curlShape(c).curveRatio).toBeGreaterThan(0);
      expect(curlShape(c).curveRatio).toBeLessThan(1);
    });
  });
});

describe('diameterWidth', () => {
  it('épaissit le trait avec le diamètre de la fibre', () => {
    const largeurs = DIAMETERS.map(diameterWidth);
    largeurs.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(largeurs[i]));
  });

  // Un à trois à l'écran là où la réalité fait un à cinq : en dessous le 0.03 disparaît,
  // au-dessus le 0.15 empâte tout.
  it('reste dans une plage lisible', () => {
    expect(diameterWidth('0.15') / diameterWidth('0.03')).toBeLessThan(4);
    expect(diameterWidth('0.03')).toBeGreaterThanOrEqual(1);
  });

  it('retombe sur le diamètre le plus courant', () => {
    expect(diameterWidth('0.42')).toBe(diameterWidth('0.07'));
  });
});

describe('densityFactor', () => {
  it('classe les densités du Classic au Mega Volume', () => {
    const f = DENSITIES.map(densityFactor);
    f.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(f[i]));
  });

  // Un 6D pose six fois plus de cils ; le dessiner littéralement donnerait un bloc noir où
  // le dégradé de longueurs — le sujet de la planche — disparaîtrait.
  it('ordonne sans compter : le rapport reste très inférieur au réel', () => {
    expect(densityFactor('Mega Volume')).toBeLessThan(3);
    expect(densityFactor('Classic')).toBe(1);
  });
});

describe('techniqueProfile', () => {
  it('donne des pointes aux techniques qui en ont, et pas aux autres', () => {
    expect(techniqueProfile('Classique').spikeEvery).toBe(0);
    expect(techniqueProfile('Volume Russe').spikeEvery).toBe(0);
    expect(techniqueProfile('Wispy').spikeEvery).toBeGreaterThan(0);
    expect(techniqueProfile('Kim K').spikeGain).toBeGreaterThan(techniqueProfile('Wispy').spikeGain);
  });

  // Les techniques de volume emploient des fibres plus fines : c'est ce qui permet d'en
  // poser plusieurs par cil naturel sans l'alourdir.
  it('affine et multiplie les fibres des techniques de volume', () => {
    const russe = techniqueProfile('Volume Russe');
    const classique = techniqueProfile('Classique');
    expect(russe.widthScale).toBeLessThan(classique.widthScale);
    expect(russe.countScale).toBeGreaterThan(classique.countScale);
  });

  it('rend un profil complet pour chaque technique du modèle', () => {
    TECHNIQUES.forEach((t) => {
      const p = techniqueProfile(t);
      expect(p.countScale).toBeGreaterThan(0);
      expect(p.widthScale).toBeGreaterThan(0);
      expect(p.clump).toBeGreaterThanOrEqual(0);
      expect(p.clump).toBeLessThanOrEqual(1);
    });
  });
});

describe('interpolateAt', () => {
  const anchors = [0.1, 0.5, 0.9];
  const values = [10, 20, 30];

  it('rend la valeur du secteur à son centre', () => {
    expect(interpolateAt(0.1, anchors, values)).toBe(10);
    expect(interpolateAt(0.5, anchors, values)).toBe(20);
    expect(interpolateAt(0.9, anchors, values)).toBe(30);
  });

  // Une marche donnerait un dessin en escalier, qui n'existe pas en cabine : deux secteurs
  // voisins se fondent sur quelques cils.
  it('fond la transition entre deux secteurs voisins', () => {
    expect(interpolateAt(0.3, anchors, values)).toBeCloseTo(15, 6);
    expect(interpolateAt(0.7, anchors, values)).toBeCloseTo(25, 6);
  });

  it('tient les bords sans extrapoler', () => {
    expect(interpolateAt(0, anchors, values)).toBe(10);
    expect(interpolateAt(1, anchors, values)).toBe(30);
    expect(interpolateAt(-5, anchors, values)).toBe(10);
  });

  it('ne jette pas sur des entrées vides', () => {
    expect(interpolateAt(0.5, [], [])).toBe(0);
    expect(interpolateAt(0.5, null, null)).toBe(0);
  });

  it('survit à deux ancres confondues', () => {
    expect(Number.isFinite(interpolateAt(0.5, [0.5, 0.5], [10, 20]))).toBe(true);
  });
});

describe('renderProfile', () => {
  it('traduit chaque secteur en nombres pour la géométrie', () => {
    const zones = [
      { curl: 'J', diameter: '0.03', density: 'Classic', style: 'Classique' },
      { curl: 'DD', diameter: '0.15', density: 'Mega Volume', style: 'Wispy' },
    ];
    const p = renderProfile(zones);
    expect(p.bends[1]).toBeGreaterThan(p.bends[0]);
    expect(p.widths[1]).toBeGreaterThan(p.widths[0]);
    expect(p.densities[1]).toBeGreaterThan(p.densities[0]);
    expect(p.profiles[1].spikeEvery).toBeGreaterThan(0);
  });

  it('ne jette pas sur des secteurs incomplets', () => {
    const p = renderProfile([{}, null]);
    expect(p.bends).toHaveLength(2);
    p.bends.forEach((b) => expect(Number.isFinite(b)).toBe(true));
  });

  it('rend des tableaux vides sans secteurs', () => {
    expect(renderProfile(null).bends).toEqual([]);
  });
});
