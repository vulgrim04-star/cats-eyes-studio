import { describe, expect, it } from 'vitest';
import { ADVISED_SHAPES, adviseForEyeShape, isRiskyChoice } from './lashAdvisor';
import { EYE_SHAPES, MAP_TEMPLATES } from './lashPresets';

describe('adviseForEyeShape', () => {
  it('conseille un cat eye sur un œil rond, pour l’étirer', () => {
    const conseil = adviseForEyeShape('Rond');
    expect(conseil.template.id).toBe('classic-cat-eye');
    expect(conseil.why).toMatch(/étire/i);
  });

  // Le piège classique de la forme est souvent l'information la plus utile.
  it('met en garde contre le cat eye sur un œil tombant', () => {
    const conseil = adviseForEyeShape('Tombant');
    expect(conseil.template.id).toBe('open-eye');
    expect(conseil.avoidTemplate.id).toBe('classic-cat-eye');
    expect(conseil.avoid).toMatch(/chute/i);
  });

  it('écarte le regard sur des yeux rapprochés, le resserre sur des yeux écartés', () => {
    expect(adviseForEyeShape('Rapproché').template.id).toBe('fox-eyes');
    expect(adviseForEyeShape('Écarté').template.id).toBe('doll-eye');
  });

  it('ignore accents et casse — la liste des formes reste modifiable', () => {
    expect(adviseForEyeShape('ecarte').template.id).toBe('doll-eye');
    expect(adviseForEyeShape('  RAPPROCHE ').template.id).toBe('fox-eyes');
  });

  // On ne conseille pas au hasard : une forme non renseignée ne doit rien déclencher.
  it('se tait sur une forme absente ou inconnue', () => {
    expect(adviseForEyeShape('')).toBeNull();
    expect(adviseForEyeShape(undefined)).toBeNull();
    expect(adviseForEyeShape('Triangulaire')).toBeNull();
  });

  it('ne propose que des modèles qui existent réellement', () => {
    const ids = MAP_TEMPLATES.map((t) => t.id);
    EYE_SHAPES.forEach((shape) => {
      const conseil = adviseForEyeShape(shape);
      expect(conseil, `aucun conseil pour « ${shape} »`).not.toBeNull();
      expect(ids).toContain(conseil.template.id);
      conseil.alternatives.forEach((alt) => expect(ids).toContain(alt.id));
      if (conseil.avoidTemplate) expect(ids).toContain(conseil.avoidTemplate.id);
    });
  });

  // Le module doit couvrir exactement les formes proposées à la saisie, sans quoi une
  // forme resterait sans conseil sans que personne ne s'en aperçoive.
  it('couvre les six formes du référentiel', () => {
    expect(new Set(ADVISED_SHAPES)).toEqual(new Set(EYE_SHAPES));
  });

  it('ne conseille jamais le modèle qu’il déconseille', () => {
    EYE_SHAPES.forEach((shape) => {
      const conseil = adviseForEyeShape(shape);
      if (conseil.avoidTemplate) expect(conseil.template.id).not.toBe(conseil.avoidTemplate.id);
    });
  });
});

describe('isRiskyChoice', () => {
  it('ne signale que le modèle déconseillé pour cette forme', () => {
    expect(isRiskyChoice('Tombant', 'classic-cat-eye')).toBe(true);
    expect(isRiskyChoice('Tombant', 'open-eye')).toBe(false);
    expect(isRiskyChoice('Amande', 'classic-cat-eye')).toBe(false);
  });

  it('reste muet sans forme ou sans modèle', () => {
    expect(isRiskyChoice('', 'classic-cat-eye')).toBe(false);
    expect(isRiskyChoice('Tombant', null)).toBe(false);
  });
});
