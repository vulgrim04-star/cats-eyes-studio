import { describe, expect, it } from 'vitest';
import { parseCycleDays, estimateNextRetouchDate } from './lashCycle';

describe('parseCycleDays', () => {
  it('retourne null pour un texte vide ou non reconnu', () => {
    expect(parseCycleDays('')).toBeNull();
    expect(parseCycleDays(undefined)).toBeNull();
    expect(parseCycleDays('quand elle veut')).toBeNull();
  });

  it('lit une seule valeur avec son unité', () => {
    expect(parseCycleDays('10 jours')).toBe(10);
    expect(parseCycleDays('3 semaines')).toBe(21);
    expect(parseCycleDays('1 mois')).toBe(30);
  });

  it('fait la moyenne pour une fourchette', () => {
    expect(parseCycleDays('2-3 semaines')).toBe(18); // (2+3)/2 * 7 = 17.5 -> 18
    expect(parseCycleDays('2 à 3 semaines')).toBe(18);
  });

  // « 1,5 mois » donnait 150 jours : le motif entier échouait sur le « 1 », repartait sur
  // le « 5 » et lisait « 5 mois ». La retouche était suggérée cinq mois trop tard.
  it('lit les valeurs décimales', () => {
    expect(parseCycleDays('1,5 mois')).toBe(45);
    expect(parseCycleDays('1.5 mois')).toBe(45);
    expect(parseCycleDays('2,5 semaines')).toBe(18); // 2.5 * 7 = 17.5 -> 18
  });
});

describe('estimateNextRetouchDate', () => {
  it("additionne le cycle à la date de la séance", () => {
    expect(estimateNextRetouchDate('2026-01-01', '2 semaines')).toBe('2026-01-15');
  });

  it('renvoie null sans cycle reconnu', () => {
    expect(estimateNextRetouchDate('2026-01-01', '')).toBeNull();
    expect(estimateNextRetouchDate('2026-01-01', 'bientôt')).toBeNull();
  });
});
