import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODULES,
  MODULE_IDS,
  canDisable,
  enabledModules,
  firstEnabled,
  normalizeModules,
  toggleModule,
} from './modules';

describe('normalizeModules', () => {
  it('active tout à l’installation', () => {
    expect(normalizeModules(undefined)).toEqual(DEFAULT_MODULES);
    expect(normalizeModules({})).toEqual(DEFAULT_MODULES);
  });

  it('respecte une désactivation explicite', () => {
    expect(normalizeModules({ brow: false }).brow).toBe(false);
    expect(normalizeModules({ brow: false }).lash).toBe(true);
  });

  // Une mise à jour qui ajoute un module ne doit pas le livrer invisible : personne ne
  // saurait qu'il existe, et il passerait pour absent.
  it('considère actif un module absent du réglage enregistré', () => {
    expect(normalizeModules({ lash: true }).simulation).toBe(true);
  });

  // Une page sans le moindre onglet est un cul-de-sac dont on ne sait pas sortir.
  it('rallume tout plutôt que de laisser un réglage qui éteint tout', () => {
    expect(normalizeModules({ lash: false, brow: false, simulation: false })).toEqual(DEFAULT_MODULES);
  });

  it('ignore les clés inconnues', () => {
    expect(Object.keys(normalizeModules({ inventé: true })).sort()).toEqual([...MODULE_IDS].sort());
  });
});

describe('canDisable', () => {
  it('refuse d’éteindre le dernier module actif', () => {
    expect(canDisable({ lash: true, brow: false, simulation: false }, 'lash')).toBe(false);
  });

  it('accepte tant qu’il en reste un autre', () => {
    expect(canDisable({ lash: true, brow: true, simulation: false }, 'lash')).toBe(true);
  });

  it('accepte toujours de réactiver', () => {
    expect(canDisable({ lash: true, brow: false, simulation: false }, 'brow')).toBe(true);
  });
});

describe('toggleModule', () => {
  it('bascule dans les deux sens', () => {
    const off = toggleModule(DEFAULT_MODULES, 'brow');
    expect(off.brow).toBe(false);
    expect(toggleModule(off, 'brow').brow).toBe(true);
  });

  it('ne touche pas aux autres modules', () => {
    const r = toggleModule(DEFAULT_MODULES, 'brow');
    expect(r.lash).toBe(true);
    expect(r.simulation).toBe(true);
  });

  it('refuse d’éteindre le dernier, sans rien casser', () => {
    const seul = { lash: true, brow: false, simulation: false };
    expect(toggleModule(seul, 'lash')).toEqual(seul);
  });

  it('ignore un identifiant inconnu', () => {
    expect(toggleModule(DEFAULT_MODULES, 'inventé')).toEqual(DEFAULT_MODULES);
  });

  it('ne modifie pas le réglage fourni', () => {
    const source = { ...DEFAULT_MODULES };
    toggleModule(source, 'brow');
    expect(source).toEqual(DEFAULT_MODULES);
  });
});

describe('enabledModules et firstEnabled', () => {
  it('ne liste que les modules actifs, dans l’ordre d’affichage', () => {
    expect(enabledModules({ lash: false }).map((m) => m.id)).toEqual(['brow', 'simulation']);
  });

  it('donne le premier actif comme onglet par défaut', () => {
    expect(firstEnabled(DEFAULT_MODULES)).toBe('lash');
    expect(firstEnabled({ lash: false, brow: false })).toBe('simulation');
  });

  it('donne toujours un module, même sur un réglage absurde', () => {
    expect(MODULE_IDS).toContain(firstEnabled({ lash: false, brow: false, simulation: false }));
  });
});
