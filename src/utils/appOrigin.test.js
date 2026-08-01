import { describe, it, expect } from 'vitest';
import { resolveOrigin } from './appOrigin.js';

describe('resolveOrigin', () => {
  it("retient l'origine de la page quand rien n'est configuré", () => {
    expect(resolveOrigin('', 'https://cats-eyes-studio.vercel.app')).toBe('https://cats-eyes-studio.vercel.app');
    expect(resolveOrigin(undefined, 'https://cats-eyes-studio.vercel.app')).toBe('https://cats-eyes-studio.vercel.app');
  });

  it("préfère l'origine configurée — c'est tout l'objet de l'application empaquetée", () => {
    // Le repli est ce que Capacitor expose sur le téléphone : le retenir enverrait les
    // appels serveur vers l'appareil lui-même.
    expect(resolveOrigin('https://cats-eyes-studio.vercel.app', 'http://localhost')).toBe(
      'https://cats-eyes-studio.vercel.app'
    );
  });

  it('ignore une valeur qui ne contient que des espaces', () => {
    // Une variable déclarée mais laissée vide dans Vercel arrive comme une chaîne d'espaces,
    // pas comme undefined : la traiter comme configurée produirait une origine vide et des
    // appels vers « /api/… » sans hôte.
    expect(resolveOrigin('   ', 'https://exemple.ch')).toBe('https://exemple.ch');
  });

  it('supprime la barre oblique finale pour ne pas doubler celle du chemin', () => {
    expect(resolveOrigin('https://exemple.ch/', '')).toBe('https://exemple.ch');
    expect(resolveOrigin('https://exemple.ch///', '')).toBe('https://exemple.ch');
  });

  it('renvoie une chaîne vide quand ni configuration ni repli ne sont exploitables', () => {
    expect(resolveOrigin(undefined, undefined)).toBe('');
    expect(resolveOrigin(null, null)).toBe('');
  });
});
