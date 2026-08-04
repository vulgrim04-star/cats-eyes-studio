import { describe, expect, it } from 'vitest';
import {
  FACE_SHAPES,
  adviceToLook,
  adviseBrow,
  adviseTone,
  analyseSymmetry,
  faceShapeId,
} from './browAdvisor';
import { BROW_TONES, SHAPE_IDS } from './browShapes';

describe('faceShapeId', () => {
  it('accepte l’identifiant comme le libellé, avec ou sans accents', () => {
    expect(faceShapeId('round')).toBe('round');
    expect(faceShapeId('Rond')).toBe('round');
    expect(faceShapeId('CŒUR')).toBe('heart');
    expect(faceShapeId(' allonge ')).toBe('long');
  });

  it('renvoie null sur une forme inconnue', () => {
    expect(faceShapeId('trapèze')).toBeNull();
    expect(faceShapeId(undefined)).toBeNull();
  });
});

describe('adviseBrow', () => {
  it('étire un visage rond et écarte les formes arrondies', () => {
    const a = adviseBrow({ faceShape: 'Rond' });
    expect(a.shape.id).toBe('high-arch');
    expect(a.avoidShape.id).toBe('rounded');
    expect(a.why).toMatch(/rondeur/i);
  });

  it('adoucit un visage carré et écarte le sourcil droit', () => {
    const a = adviseBrow({ faceShape: 'Carré' });
    expect(a.shape.id).toBe('rounded');
    expect(a.avoidShape.id).toBe('straight');
  });

  it('raccourcit un visage allongé avec une ligne droite', () => {
    expect(adviseBrow({ faceShape: 'Allongé' }).shape.id).toBe('straight');
  });

  it('ne conseille rien sur une morphologie non renseignée', () => {
    expect(adviseBrow({})).toBeNull();
    expect(adviseBrow({ faceShape: 'inventée' })).toBeNull();
  });

  // Un conseiller qui proposerait une forme absente de la bibliothèque serait inapplicable.
  it('ne propose que des formes qui existent, et jamais celle qu’il déconseille', () => {
    FACE_SHAPES.forEach((face) => {
      const a = adviseBrow({ faceShape: face.id });
      expect(a, `aucun conseil pour « ${face.label} »`).not.toBeNull();
      expect(SHAPE_IDS).toContain(a.shape.id);
      a.alternatives.forEach((alt) => expect(SHAPE_IDS).toContain(alt.id));
      if (a.avoidShape) {
        expect(SHAPE_IDS).toContain(a.avoidShape.id);
        expect(a.shape.id).not.toBe(a.avoidShape.id);
      }
    });
  });

  it('formule une phrase de conseil complète', () => {
    const a = adviseBrow({ faceShape: 'Ovale', hairTone: 'Châtain clair' });
    expect(a.sentence).toMatch(/^Cette cliente conviendrait à un Soft Arch avec une teinte .+ % d'intensité\.$/);
  });

  it('se passe de la couleur de cheveux sans se taire', () => {
    const a = adviseBrow({ faceShape: 'Ovale' });
    expect(a.tone).toBeNull();
    expect(a.sentence).toMatch(/Soft Arch/);
  });
});

describe('adviseTone', () => {
  // Assorti exactement au cheveu, le sourcil paraît postiche.
  it('descend d’un ton sous une couleur de cheveux moyenne', () => {
    const a = adviseTone('Caramel');
    const source = BROW_TONES.findIndex((t) => t.label === 'Caramel');
    expect(BROW_TONES.indexOf(a.tone)).toBe(source - 1);
  });

  // Un sourcil aussi noir que le cheveu durcit le regard.
  it('remonte de deux tons sur des cheveux très foncés', () => {
    const a = adviseTone('Noir');
    expect(BROW_TONES.indexOf(a.tone)).toBe(2);
    expect(a.why).toMatch(/durcit/i);
  });

  it('accepte l’identifiant comme le libellé', () => {
    expect(adviseTone('t8').tone.id).toBe(adviseTone('Caramel').tone.id);
  });

  it('se tait sur une couleur inconnue', () => {
    expect(adviseTone('vert')).toBeNull();
    expect(adviseTone(undefined)).toBeNull();
  });

  it('ne sort jamais du nuancier', () => {
    BROW_TONES.forEach((t) => expect(BROW_TONES).toContain(adviseTone(t.id).tone));
  });
});

describe('analyseSymmetry', () => {
  // Sous 1,5 % de la largeur du visage, l'écart n'est pas visible : le signaler ferait
  // douter d'une symétrie parfaitement acceptable.
  it('ne signale rien sous le seuil du visible', () => {
    expect(analyseSymmetry(100, 101, 200).asymmetric).toBe(false);
    expect(analyseSymmetry(100, 101, 200).symmetry).toBe(50);
  });

  it('signale un écart net et donne le réglage qui le compense', () => {
    const a = analyseSymmetry(100, 112, 200);
    expect(a.asymmetric).toBe(true);
    expect(a.symmetry).toBeGreaterThan(50);
    expect(a.note).toMatch(/gauche/);
  });

  it('nomme le bon côté dans les deux sens', () => {
    expect(analyseSymmetry(112, 100, 200).note).toMatch(/droit/);
  });

  it('reste dans 0–100 même sur un écart absurde', () => {
    expect(analyseSymmetry(0, 5000, 200).symmetry).toBe(100);
    expect(analyseSymmetry(5000, 0, 200).symmetry).toBe(0);
  });

  it('supporte des mesures manquantes', () => {
    expect(analyseSymmetry(undefined, 100, 200).asymmetric).toBe(false);
    expect(analyseSymmetry(100, 100, 0).asymmetric).toBe(false);
  });
});

describe('adviceToLook', () => {
  it('ne touche qu’à la forme, la teinte, l’intensité et la symétrie', () => {
    const patch = adviceToLook(adviseBrow({ faceShape: 'Rond', hairTone: 'Brun naturel' }));
    expect(Object.keys(patch).sort()).toEqual(['intensity', 'shapeId', 'symmetry', 'toneId']);
  });

  // Les effets et les retouches de zone sont le travail de la praticienne : un conseil ne
  // doit jamais les effacer.
  it('ne touche ni aux effets ni aux retouches de zone', () => {
    const patch = adviceToLook(adviseBrow({ faceShape: 'Ovale' }));
    expect(patch.effectId).toBeUndefined();
    expect(patch.zones).toBeUndefined();
  });

  it('renvoie un objet vide sans conseil', () => {
    expect(adviceToLook(null)).toEqual({});
  });
});
