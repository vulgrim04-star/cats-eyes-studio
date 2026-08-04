import { describe, expect, it } from 'vitest';
import {
  BROW_COLORS,
  BROW_SERVICES,
  browSummary,
  clampPercent,
  colorById,
  minutesForService,
  normalizeBrowSession,
  renderedColor,
} from './browModel';

describe('nuancier', () => {
  // Une pastille qui n'afficherait pas la vraie teinte ne servirait à rien : c'est à l'œil
  // qu'on choisit une couleur de teinture.
  it('porte douze teintes numérotées, toutes en hexadécimal valide', () => {
    expect(BROW_COLORS).toHaveLength(12);
    BROW_COLORS.forEach((c) => {
      expect(c.hex, `${c.label} : ${c.hex}`).toMatch(/^#[0-9A-F]{6}$/i);
      expect(c.number).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(2);
    });
  });

  it('n’a ni numéro ni identifiant en double', () => {
    expect(new Set(BROW_COLORS.map((c) => c.id)).size).toBe(12);
    expect(new Set(BROW_COLORS.map((c) => c.number)).size).toBe(12);
  });

  it('retombe sur la première teinte plutôt que sur rien', () => {
    expect(colorById('inconnu').id).toBe('c1');
    expect(colorById(undefined).id).toBe('c1');
  });
});

describe('clampPercent', () => {
  it('borne à 0–100 et arrondit', () => {
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-20)).toBe(0);
    expect(clampPercent(70.6)).toBe(71);
    expect(clampPercent('45')).toBe(45);
  });

  it('retombe sur la valeur de repli quand la saisie n’est pas un nombre', () => {
    expect(clampPercent('abc', 70)).toBe(70);
    expect(clampPercent(undefined, 60)).toBe(60);
  });
});

describe('normalizeBrowSession', () => {
  it('complète une séance vide sans rien inventer d’invalide', () => {
    const s = normalizeBrowSession(null);
    expect(s.intensity).toBe(70);
    expect(s.saturation).toBe(60);
    expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rattrape des valeurs hors bornes venues d’une ancienne fiche', () => {
    const s = normalizeBrowSession({ intensity: 300, saturation: -5, processingMinutes: -12, colorId: 'zzz' });
    expect(s.intensity).toBe(100);
    expect(s.saturation).toBe(0);
    expect(s.processingMinutes).toBe(0);
    expect(s.colorId).toBe('c1');
  });
});

describe('minutesForService', () => {
  it('pré-remplit le temps de pose de la prestation', () => {
    expect(minutesForService('Henné')).toBe(25);
    expect(minutesForService('Brow Lift')).toBe(12);
  });

  it('renvoie zéro quand la notion ne s’applique pas, ou pour une prestation libre', () => {
    expect(minutesForService('Restructuration')).toBe(0);
    expect(minutesForService('Prestation maison')).toBe(0);
  });

  it('couvre toutes les prestations proposées', () => {
    BROW_SERVICES.forEach((s) => expect(minutesForService(s.value)).toBe(s.minutes));
  });
});

describe('renderedColor', () => {
  // Des curseurs qui ne changeraient rien à l'image ne serviraient à rien.
  it('éclaircit le rendu quand l’intensité baisse', () => {
    const fort = renderedColor({ colorId: 'c8', intensity: 100, saturation: 60 });
    const faible = renderedColor({ colorId: 'c8', intensity: 20, saturation: 60 });
    expect(faible.opacity).toBeLessThan(fort.opacity);
  });

  // Un schéma vide se lit comme une panne, pas comme « teinture légère ».
  it('ne fait jamais disparaître le sourcil, même à intensité nulle', () => {
    expect(renderedColor({ colorId: 'c8', intensity: 0 }).opacity).toBeGreaterThanOrEqual(0.2);
  });

  it('ramène la teinte vers le gris quand la saturation tombe à zéro', () => {
    const gris = renderedColor({ colorId: 'c10', intensity: 100, saturation: 0 });
    const rgb = gris.hex.slice(1).match(/../g).map((h) => parseInt(h, 16));
    expect(rgb[0]).toBe(rgb[1]);
    expect(rgb[1]).toBe(rgb[2]);
  });

  it('conserve la teinte exacte à saturation maximale', () => {
    expect(renderedColor({ colorId: 'c10', intensity: 100, saturation: 100 }).hex).toBe('#A9633A');
  });

  it('produit toujours un hexadécimal valide', () => {
    BROW_COLORS.forEach((c) => {
      [0, 37, 100].forEach((saturation) => {
        expect(renderedColor({ colorId: c.id, intensity: 80, saturation }).hex).toMatch(/^#[0-9A-F]{6}$/);
      });
    });
  });
});

describe('browSummary', () => {
  it('résume la séance en une ligne lisible', () => {
    expect(browSummary({ service: 'Henné', colorId: 'c10', intensity: 80, processingMinutes: 25 })).toBe(
      'Henné · n°10 Cuivré · 80 % · 25 min'
    );
  });

  it('omet le temps de pose quand il ne s’applique pas', () => {
    expect(browSummary({ service: 'Restructuration', colorId: 'c1', intensity: 50, processingMinutes: 0 })).toBe(
      'Restructuration · n°1 Clair · 50 %'
    );
  });
});
