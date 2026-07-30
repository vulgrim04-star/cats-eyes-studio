import { afterEach, describe, expect, it, vi } from 'vitest';

// Le magasin réel est persisté : lui écrire dessus déclencherait une écriture vers
// `localStorage`, absent sous l'environnement node. Ce fichier teste le formatage, pas la
// persistance — on lui substitue donc un magasin minimal.
const state = { salon: { currency: 'EUR' } };
vi.mock('../store/useSettingsStore', () => ({
  useSettingsStore: { getState: () => state },
}));

const { currencySymbol, formatPrice, formatDuration } = await import('./format');

const setCurrency = (currency) => {
  state.salon = { currency };
};

afterEach(() => setCurrency('EUR'));

// Le cœur du signalement : les MONTANTS suivaient déjà la devise, mais des libellés comme
// « Prix (€) » la portaient en dur. `currencySymbol` est ce qui leur permet de suivre — il
// doit donc relire le réglage à chaque appel, et non le figer à l'import du module.
describe('currencySymbol', () => {
  it('suit la devise choisie dans les réglages', () => {
    setCurrency('EUR');
    expect(currencySymbol()).toBe('€');
    setCurrency('CHF');
    expect(currencySymbol()).toBe('CHF');
    setCurrency('GBP');
    expect(currencySymbol()).toBe('£');
    setCurrency('USD');
    expect(currencySymbol()).toBe('$');
  });

  it('retombe sur le code lui-même pour une devise inconnue', () => {
    setCurrency('JPY');
    expect(currencySymbol()).toBe('JPY');
  });

  it('retombe sur l’euro quand aucune devise n’est réglée', () => {
    setCurrency(undefined);
    expect(currencySymbol()).toBe('€');
  });
});

describe('formatPrice', () => {
  it('utilise le même symbole que les libellés', () => {
    setCurrency('CHF');
    expect(formatPrice(65)).toBe('65 CHF');
    expect(formatPrice(65.5)).toBe('65.50 CHF');
    setCurrency('EUR');
    expect(formatPrice(65)).toBe('65 €');
  });
});

describe('formatDuration', () => {
  it('reste lisible en heures et minutes', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(135)).toBe('2 h 15');
  });
});
