import { describe, expect, it } from 'vitest';
import { checkLength, safeLimitFor, safetyMessage, unsafeSectors } from './lashSafety';
import { MM_MAX } from './lashCalculations';

describe('safeLimitFor', () => {
  it('abaisse la limite sur des cils fins', () => {
    expect(safeLimitFor({ lashType: 'Fin' }).maxMm).toBe(11);
  });

  it('abaisse davantage sur des cils fragilisés, puis abîmés', () => {
    expect(safeLimitFor({ lashCondition: 'Fragilisé' }).maxMm).toBe(10);
    expect(safeLimitFor({ lashCondition: 'Abîmé' }).maxMm).toBe(9);
  });

  // « très fin » contient « fin » : sans la recherche du minimum, l'ordre de lecture des
  // règles déciderait de la sécurité de la cliente.
  it('retient toujours la contrainte la plus stricte quand plusieurs s’appliquent', () => {
    expect(safeLimitFor({ lashType: 'Fin', lashCondition: 'Abîmé' }).maxMm).toBe(9);
    expect(safeLimitFor({ lashType: 'Épais', lashCondition: 'Fragilisé' }).maxMm).toBe(10);
    expect(safeLimitFor({ lashType: 'Très fin' }).maxMm).toBe(10);
  });

  it('ignore accents et majuscules', () => {
    expect(safeLimitFor({ lashCondition: 'FRAGILISÉ' }).maxMm).toBe(10);
    expect(safeLimitFor({ lashCondition: 'fragilise' }).maxMm).toBe(10);
  });

  // Les listes sont modifiables dans les Réglages. Une alerte déclenchée par un mot qu'on
  // ne comprend pas est une alerte qu'on apprend à ignorer.
  it('reste permissif sur un vocabulaire inconnu', () => {
    expect(safeLimitFor({ lashType: 'Soyeux', lashCondition: 'Post-cure' })).toEqual({ maxMm: MM_MAX, reason: null });
    expect(safeLimitFor({}).maxMm).toBe(MM_MAX);
    expect(safeLimitFor(undefined).maxMm).toBe(MM_MAX);
    expect(safeLimitFor({ lashType: '   ' }).maxMm).toBe(MM_MAX);
  });

  it('nomme la raison, pour que l’alerte soit compréhensible', () => {
    expect(safeLimitFor({ lashCondition: 'Abîmé' }).reason).toBe('cils abîmés');
    expect(safeLimitFor({ lashType: 'Épais' }).reason).toBe('cils épais et résistants');
  });
});

describe('checkLength', () => {
  it('signale un dépassement et le chiffre', () => {
    expect(checkLength(13, { lashCondition: 'Fragilisé' })).toEqual({
      over: true, mm: 13, maxMm: 10, excess: 3, reason: 'cils fragilisés',
    });
  });

  it('ne signale rien à la limite exacte', () => {
    expect(checkLength(10, { lashCondition: 'Fragilisé' }).over).toBe(false);
  });

  it('accepte une longueur écrite en texte', () => {
    expect(checkLength('12,5', { lashType: 'Fin' }).over).toBe(true);
  });
});

describe('unsafeSectors', () => {
  const cliente = { lashType: 'Fin' };

  it('ne retient que les secteurs au-delà de la limite, avec leur index', () => {
    expect(unsafeSectors([8, 10, 11, 12, 13, 9], cliente)).toEqual([
      { index: 3, mm: 12, maxMm: 11, excess: 1 },
      { index: 4, mm: 13, maxMm: 11, excess: 2 },
    ]);
  });

  it('ne retient rien sur une pose prudente, ni sur une cliente non renseignée', () => {
    expect(unsafeSectors([8, 9, 10, 11], cliente)).toEqual([]);
    expect(unsafeSectors([8, 14, 16], {})).toEqual([]);
  });

  it('supporte une liste absente', () => {
    expect(unsafeSectors(undefined, cliente)).toEqual([]);
  });
});

describe('safetyMessage', () => {
  it('accorde le nombre et cite le pire secteur', () => {
    expect(safetyMessage([8, 12, 9], { lashType: 'Fin' })).toBe(
      "Un secteur dépasse 11 mm sur cils fins — jusqu'à 12 mm. Risque de casse du cil naturel."
    );
    expect(safetyMessage([8, 12, 13], { lashType: 'Fin' })).toBe(
      "2 secteurs dépassent 11 mm sur cils fins — jusqu'à 13 mm. Risque de casse du cil naturel."
    );
  });

  it('se tait quand tout va bien', () => {
    expect(safetyMessage([8, 9, 10], { lashType: 'Fin' })).toBeNull();
    expect(safetyMessage([8, 16], {})).toBeNull();
  });
});
