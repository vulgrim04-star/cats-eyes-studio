import { describe, expect, it } from 'vitest';
import {
  EMPTY_LASH_MAP,
  applyProfile,
  carryOverMap,
  copyEye,
  createEye,
  diffLashMaps,
  drawableKey,
  effectiveZone,
  eyeLengths,
  getEye,
  hasOverride,
  lengthRange,
  mirrorEye,
  normalizeLashMap,
  pasteZone,
  resizeSectors,
  sampleProfileAt,
  sectorLabel,
  setGlobalField,
  setZoneField,
  setZoneLength,
  zonesFromKey,
} from './lashModel';
import { SECTOR_MAX, SECTOR_MIN } from './lashGeometry';
import { MM_MAX, MM_MIN } from './lashCalculations';

/** Fiche telle qu'elle était enregistrée AVANT la refonte par secteurs. */
const LEGACY_MAP = {
  id: 'lm_1',
  date: '2026-05-20',
  poseType: 'Retouche 3 sem',
  curl: 'D',
  thickness: '0.05',
  styles: ['Volume Russe'],
  effects: ['Cat Eye'],
  layers: { top: '11', mid: '10', bottom: '9' },
  zonesLeft: ['9', '10', '11', '11', '10', '9'],
  zonesRight: ['9', '10', '11', '12', '12', '13'],
  notes: 'Effet naturel',
};

describe('normalizeLashMap — reprise des fiches existantes', () => {
  it('convertit les longueurs en tableau vers des secteurs numérotés', () => {
    const map = normalizeLashMap(LEGACY_MAP);
    expect(map.leftEye.zones).toHaveLength(6);
    expect(eyeLengths(map.leftEye)).toEqual([9, 10, 11, 11, 10, 9]);
    expect(eyeLengths(map.rightEye)).toEqual([9, 10, 11, 12, 12, 13]);
    expect(map.leftEye.zones.map((z) => z.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('remonte courbure, épaisseur et technique dans les réglages globaux des deux yeux', () => {
    const map = normalizeLashMap(LEGACY_MAP);
    expect(map.leftEye.global).toMatchObject({ curl: 'D', diameter: '0.05', style: 'Volume Russe' });
    expect(map.rightEye.global).toMatchObject({ curl: 'D', diameter: '0.05' });
  });

  it('efface les champs de l’ancien modèle une fois convertis', () => {
    const map = normalizeLashMap(LEGACY_MAP);
    ['zonesLeft', 'zonesRight', 'curl', 'thickness', 'styles', 'layers'].forEach((key) => {
      expect(map[key]).toBeUndefined();
    });
    expect(map.notes).toBe('Effet naturel');
    expect(map.date).toBe('2026-05-20');
  });

  it('est idempotente : renormaliser une fiche déjà convertie ne change rien', () => {
    const once = normalizeLashMap(LEGACY_MAP);
    expect(normalizeLashMap(once)).toEqual(once);
  });

  it('aligne les deux yeux sur le même nombre de secteurs', () => {
    const map = normalizeLashMap({ zonesLeft: ['9', '10', '11', '12'], zonesRight: ['9', '10', '11', '12', '13', '13', '13'] });
    expect(map.leftEye.zones).toHaveLength(7);
    expect(map.rightEye.zones).toHaveLength(7);
  });

  it('rend une fiche vierge exploitable sans argument', () => {
    const map = normalizeLashMap(null);
    expect(map.leftEye.zones.length).toBeGreaterThanOrEqual(SECTOR_MIN);
    expect(map.rightEye.zones).toHaveLength(map.leftEye.zones.length);
  });
});

describe('effectiveZone — règle de surcharge', () => {
  it('hérite du réglage global tant que le secteur ne le surcharge pas', () => {
    const eye = createEye(6, { curl: 'C', diameter: '0.07' });
    const zone = effectiveZone(eye, 2);
    expect(zone).toMatchObject({ curl: 'C', diameter: '0.07', overrides: [] });
  });

  it('applique la surcharge et la signale', () => {
    let map = normalizeLashMap(LEGACY_MAP);
    map = setZoneField(map, 'left', 4, 'curl', 'CC');
    const zone = effectiveZone(getEye(map, 'left'), 4);
    expect(zone.curl).toBe('CC');
    expect(zone.overrides).toEqual(['curl']);
    // Les autres secteurs restent sur le global.
    expect(effectiveZone(getEye(map, 'left'), 3).curl).toBe('D');
  });

  it('revient au global quand la surcharge est retirée', () => {
    let map = setZoneField(normalizeLashMap(LEGACY_MAP), 'left', 1, 'density', '5D');
    expect(hasOverride(getEye(map, 'left').zones[1])).toBe(true);
    map = setZoneField(map, 'left', 1, 'density', null);
    expect(hasOverride(getEye(map, 'left').zones[1])).toBe(false);
    expect(effectiveZone(getEye(map, 'left'), 1).density).toBe('Classic');
  });

  it('changer le global déplace tous les secteurs non surchargés', () => {
    let map = setZoneField(normalizeLashMap(LEGACY_MAP), 'left', 0, 'curl', 'L');
    map = setGlobalField(map, 'left', 'curl', 'DD');
    expect(effectiveZone(getEye(map, 'left'), 0).curl).toBe('L');
    expect(effectiveZone(getEye(map, 'left'), 1).curl).toBe('DD');
  });
});

describe('écritures', () => {
  it('ne mute jamais la fiche source', () => {
    const map = normalizeLashMap(LEGACY_MAP);
    const next = setZoneLength(map, 'left', 0, 14);
    expect(next.leftEye.zones[0].length).toBe(14);
    expect(map.leftEye.zones[0].length).toBe(9);
    expect(next.rightEye).toBe(map.rightEye);
  });

  it('borne et arrondit les longueurs saisies', () => {
    const map = normalizeLashMap(LEGACY_MAP);
    expect(setZoneLength(map, 'left', 0, 99).leftEye.zones[0].length).toBe(MM_MAX);
    expect(setZoneLength(map, 'left', 0, 1).leftEye.zones[0].length).toBe(MM_MIN);
    expect(setZoneLength(map, 'left', 0, 11.3).leftEye.zones[0].length).toBe(11.5);
  });

  it('colle toutes les propriétés d’un secteur sur un autre, en gardant son numéro', () => {
    let map = setZoneField(normalizeLashMap(LEGACY_MAP), 'left', 5, 'curl', 'CC');
    map = setZoneLength(map, 'left', 5, 15);
    const source = getEye(map, 'left').zones[5];
    map = pasteZone(map, 'right', 0, source);
    const pasted = getEye(map, 'right').zones[0];
    expect(pasted).toMatchObject({ id: 1, length: 15, curl: 'CC' });
  });

  it('redimensionne les deux yeux ensemble, en bornant', () => {
    const map = resizeSectors(normalizeLashMap(LEGACY_MAP), 12);
    expect(map.leftEye.zones).toHaveLength(12);
    expect(map.rightEye.zones).toHaveLength(12);
    // Les secteurs ajoutés prolongent le dernier connu.
    expect(map.leftEye.zones[11].length).toBe(9);
    expect(resizeSectors(map, 99).leftEye.zones).toHaveLength(SECTOR_MAX);
    expect(resizeSectors(map, 1).leftEye.zones).toHaveLength(SECTOR_MIN);
    expect(map.leftEye.zones.map((z) => z.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('inverse un œil et recopie un œil sur l’autre', () => {
    const map = normalizeLashMap(LEGACY_MAP);
    expect(eyeLengths(mirrorEye(map, 'right').rightEye)).toEqual([13, 12, 12, 11, 10, 9]);
    const copied = copyEye(map, 'right');
    expect(eyeLengths(copied.leftEye)).toEqual(eyeLengths(map.rightEye));
    // Copie profonde : modifier l'un ne touche pas l'autre.
    const after = setZoneLength(copied, 'left', 0, 6);
    expect(after.rightEye.zones[0].length).toBe(9);
  });
});

describe('profils de modèle', () => {
  it('rééchantillonne un profil sur n’importe quel nombre de secteurs', () => {
    expect(sampleProfileAt([8, 13], 0, 5)).toBe(8);
    expect(sampleProfileAt([8, 13], 4, 5)).toBe(13);
    expect(sampleProfileAt([8, 13], 2, 5)).toBe(10.5);
  });

  it('applique un modèle à un œil sans toucher à l’autre', () => {
    const map = applyProfile(normalizeLashMap(LEGACY_MAP), 'left', [8, 13], { curl: 'CC' });
    expect(eyeLengths(map.leftEye)[0]).toBe(8);
    expect(eyeLengths(map.leftEye)[5]).toBe(13);
    expect(map.leftEye.global.curl).toBe('CC');
    expect(eyeLengths(map.rightEye)).toEqual([9, 10, 11, 12, 12, 13]);
  });
});

describe('affichage', () => {
  it('résume l’étendue des longueurs', () => {
    const map = normalizeLashMap(LEGACY_MAP);
    expect(lengthRange(map.leftEye)).toBe('9 – 11 mm');
    expect(lengthRange(createEye(6))).toBe('11 mm');
  });

  it('nomme les coins et le centre', () => {
    expect(sectorLabel(0, 12)).toBe('Coin interne');
    expect(sectorLabel(11, 12)).toBe('Coin externe');
    expect(sectorLabel(5, 12)).toBe('Centre (6)');
    expect(sectorLabel(2, 12)).toBe('Secteur 3');
  });
});

describe('diffLashMaps', () => {
  it('ne relève rien entre deux fiches identiques', () => {
    const map = normalizeLashMap(LEGACY_MAP);
    const diff = diffLashMaps(map, map);
    expect(diff.globals).toEqual([]);
    expect(diff.sectors.left).toEqual([]);
    expect(diff.averages.left).toBe(0);
  });

  it('relève les secteurs modifiés et les réglages globaux', () => {
    const previous = normalizeLashMap(LEGACY_MAP);
    let current = setZoneLength(previous, 'left', 2, 12);
    current = setGlobalField(current, 'left', 'curl', 'CC');
    const diff = diffLashMaps(current, previous);
    expect(diff.sectors.left).toEqual([{ index: 2, from: 11, to: 12, delta: 1 }]);
    expect(diff.sectors.right).toEqual([]);
    expect(diff.globals).toContainEqual({ side: 'left', field: 'curl', label: 'Courbure', from: 'D', to: 'CC' });
  });

  it('compare aussi une fiche à l’ancienne forme', () => {
    const diff = diffLashMaps({ ...LEGACY_MAP, zonesLeft: ['10', '10', '11', '11', '10', '9'] }, LEGACY_MAP);
    expect(diff.sectors.left).toEqual([{ index: 0, from: 9, to: 10, delta: 1 }]);
  });

  it('rend un résultat vide sans fiche de comparaison', () => {
    expect(diffLashMaps(normalizeLashMap(LEGACY_MAP), null).globals).toEqual([]);
  });
});

describe('carryOverMap', () => {
  const previous = {
    id: 'lm_1',
    date: '2026-07-12',
    appointmentId: 'apt_9',
    poseType: 'Pose complète',
    eyeShape: 'Amande',
    setShape: 'Cat Eye',
    adhesive: 'Sensitive 1-2 s',
    products: 'Bouquets 0.05',
    sensitivities: 'Larmoiement en fin de pose',
    notes: 'Cliente très bavarde',
    advice: 'Brosser chaque matin',
    poseDuration: '2 h 15',
    leftEye: createEye(6, { curl: 'CC', diameter: '0.05', style: 'Volume Russe' }),
    rightEye: createEye(6, { curl: 'CC', diameter: '0.05', style: 'Volume Russe' }),
  };

  it('reporte la technique et le profil de longueurs', () => {
    const next = carryOverMap(previous, '2026-08-02');
    expect(next.rightEye.global.curl).toBe('CC');
    expect(next.rightEye.global.style).toBe('Volume Russe');
    expect(next.rightEye.zones).toHaveLength(6);
    expect(eyeLengths(next.rightEye)).toEqual(eyeLengths(normalizeLashMap(previous).rightEye));
  });

  it("reporte l'anatomie et les produits, qui ne changent pas d'une séance à l'autre", () => {
    const next = carryOverMap(previous, '2026-08-02');
    expect(next.eyeShape).toBe('Amande');
    expect(next.setShape).toBe('Cat Eye');
    expect(next.adhesive).toBe('Sensitive 1-2 s');
    expect(next.sensitivities).toBe('Larmoiement en fin de pose');
  });

  // Ce qui raconte UNE séance ne doit jamais déteindre sur la suivante : le dossier
  // deviendrait faux sans que personne ne s'en aperçoive.
  it('ne reporte ni la date, ni les notes, ni les durées, ni le rendez-vous lié', () => {
    const next = carryOverMap(previous, '2026-08-02');
    expect(next.date).toBe('2026-08-02');
    expect(next.notes).toBe('');
    expect(next.advice).toBe('');
    expect(next.poseDuration).toBe('');
    expect(next.appointmentId).toBeNull();
  });

  // Une pose complète est suivie d'une retouche : reconduire « Pose complète » ferait
  // entrer une erreur dans le dossier à chaque reprise.
  it('ne reconduit pas le type de séance', () => {
    expect(carryOverMap(previous, '2026-08-02').poseType).toBe(EMPTY_LASH_MAP.poseType);
  });

  it('ne modifie pas la fiche source', () => {
    const copie = JSON.parse(JSON.stringify(previous));
    const next = carryOverMap(previous, '2026-08-02');
    next.rightEye.global.curl = 'D';
    next.rightEye.zones[0].length = 99;
    expect(previous).toEqual(copie);
  });

  it('accepte une fiche de l’ancien format', () => {
    const next = carryOverMap({ date: '2026-06-01', curl: 'D', zonesRight: ['9', '11', '13'], zonesLeft: ['9', '11', '13'] }, '2026-08-02');
    expect(next.rightEye.global.curl).toBe('D');
    expect(next.rightEye.zones.length).toBeGreaterThanOrEqual(6);
  });
});

describe('signature de dessin', () => {
  const base = () => normalizeLashMap({ leftEye: createEye(8), rightEye: createEye(8) });

  it('rend les secteurs résolus, réglage global appliqué', () => {
    let map = base();
    map = setGlobalField(map, 'right', 'curl', 'D');
    map = setZoneField(map, 'right', 2, 'curl', 'L');
    const zones = zonesFromKey(drawableKey(getEye(map, 'right')));
    expect(zones).toHaveLength(8);
    expect(zones[0].curl).toBe('D');
    expect(zones[2].curl).toBe('L');
  });

  // La raison d'être de la paire : la clé sert de dépendance de mémoïsation, la relecture
  // rend les secteurs à l'intérieur du calcul. Si elles cessaient de se répondre, le dessin
  // se figerait sur une valeur périmée sans que rien ne le signale.
  it('fait l’aller-retour sans perte sur toutes les propriétés dessinées', () => {
    let map = base();
    ['curl', 'diameter', 'density', 'style'].forEach((field, i) => {
      map = setZoneField(map, 'right', i, field, { curl: 'DD', diameter: '0.15', density: '5D', style: 'Kim K' }[field]);
    });
    map = setZoneLength(map, 'right', 5, 13.5);
    const eye = getEye(map, 'right');
    const zones = zonesFromKey(drawableKey(eye));
    zones.forEach((zone, i) => {
      const resolved = effectiveZone(eye, i);
      expect(zone.length).toBe(resolved.length);
      ['curl', 'diameter', 'density', 'style'].forEach((f) => expect(zone[f]).toBe(resolved[f]));
    });
  });

  it('rend la longueur en nombre, jamais en chaîne', () => {
    const zones = zonesFromKey(drawableKey(getEye(setZoneLength(base(), 'right', 0, 12), 'right')));
    zones.forEach((zone) => expect(typeof zone.length).toBe('number'));
  });

  // Sans cela, la frange — quelque 240 tracés — se régénérerait à chaque frappe dans une
  // note de secteur, pendant la pose.
  it('ne bouge pas quand on modifie ce qui ne se dessine pas', () => {
    const map = base();
    const avant = drawableKey(getEye(map, 'right'));
    const apres = setZoneField(setZoneField(map, 'right', 1, 'notes', 'à surveiller'), 'right', 1, 'color', 'Brun');
    expect(drawableKey(getEye(apres, 'right'))).toBe(avant);
  });

  it('bouge dès qu’une propriété dessinée change', () => {
    const map = base();
    const avant = drawableKey(getEye(map, 'right'));
    Object.entries({ curl: 'DD', diameter: '0.15', density: '5D', style: 'Wispy' }).forEach(
      ([field, value]) => {
        const apres = setZoneField(map, 'right', 3, field, value);
        expect(drawableKey(getEye(apres, 'right'))).not.toBe(avant);
      }
    );
  });

  it('ne jette pas sur une signature vide', () => {
    expect(zonesFromKey('')).toEqual([]);
    expect(zonesFromKey(null)).toEqual([]);
  });
});
