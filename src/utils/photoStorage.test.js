import { describe, expect, it, vi, beforeEach } from 'vitest';

const createSignedUrl = vi.fn();
vi.mock('../lib/supabaseClient', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl }) } },
}));
vi.mock('../store/useAuthStore', () => ({ useAuthStore: { getState: () => ({ session: null }) } }));
vi.mock('./demoFlag', () => ({ isDemoActive: () => false }));

const { resolvePhotoSrc, collectPhotoPaths } = await import('./photoStorage');

// Les URL signées sont mises en cache par chemin au sein du module : chaque test utilise
// donc un chemin qui lui est propre, sinon il lirait le résultat du test précédent.
let pathCounter = 0;
const uniquePath = () => `u/c/photo-${(pathCounter += 1)}-before.jpg`;

beforeEach(() => {
  createSignedUrl.mockReset();
});

describe('resolvePhotoSrc', () => {
  it('préfère le chemin de stockage quand il se résout', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed/a.jpg' }, error: null });
    await expect(resolvePhotoSrc({ path: uniquePath(), legacyUrl: 'data:image/jpeg;base64,AAA' }))
      .resolves.toBe('https://signed/a.jpg');
  });

  // Fichier supprimé, hors ligne, ou sauvegarde importée depuis un autre compte : le chemin
  // gagnait systématiquement, donc une image héritée parfaitement valide n'était jamais
  // essayée et l'utilisatrice ne voyait qu'une vignette grise.
  it("retombe sur l'image héritée quand le chemin est irrésolvable", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'not found' } });
    await expect(resolvePhotoSrc({ path: uniquePath(), legacyUrl: 'data:image/jpeg;base64,AAA' }))
      .resolves.toBe('data:image/jpeg;base64,AAA');
  });

  it('renvoie null quand il n\'y a rien à afficher', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'not found' } });
    await expect(resolvePhotoSrc({ path: uniquePath(), legacyUrl: '' })).resolves.toBeNull();
    await expect(resolvePhotoSrc({ path: '', legacyUrl: '' })).resolves.toBeNull();
  });
});

describe('collectPhotoPaths', () => {
  it('rassemble les chemins de toutes les séances, en ignorant les vides', () => {
    const clients = [
      { photos: [{ beforePath: 'a', afterPath: '' }, { beforePath: 'b', afterPath: 'c' }] },
      { photos: [] },
      {},
    ];
    expect(collectPhotoPaths(clients)).toEqual(['a', 'b', 'c']);
    expect(collectPhotoPaths(undefined)).toEqual([]);
  });
});
