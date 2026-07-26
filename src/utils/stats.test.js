import { describe, expect, it } from 'vitest';
import { trendPercent } from './stats';

describe('trendPercent', () => {
  it('calcule la variation par rapport à la période précédente', () => {
    expect(trendPercent(150, 100)).toBe(50);
    expect(trendPercent(50, 100)).toBe(-50);
    expect(trendPercent(100, 100)).toBe(0);
  });

  // Un jour de fermeture suivi d'un jour à 4 RDV affichait « +100% vs hier », ce qui laisse
  // entendre un doublement là où l'on passe de rien à quelque chose. Sans base, pas de
  // pourcentage : KpiCard masque alors la pastille.
  it("ne renvoie aucune tendance quand il n'y a pas de base de comparaison", () => {
    expect(trendPercent(4, 0)).toBeNull();
    expect(trendPercent(0, 0)).toBeNull();
  });
});
