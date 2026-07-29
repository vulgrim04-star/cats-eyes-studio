import { describe, expect, it } from 'vitest';
import { useClientsStore } from './useClientsStore';

// Régression : la migration v1 -> v2 remplaçait autrefois silencieusement les clientes
// réelles d'un compte par les données de démo (voir migrate() dans useClientsStore.js).
// Depuis la v4, elle convertit en plus les Lash Maps vers le modèle par secteurs.
describe('useClientsStore migrate', () => {
  const migrate = useClientsStore.persist.getOptions().migrate;

  it('préserve les fiches clientes déjà persistées', () => {
    const v1State = {
      clients: [
        { id: 'cli_1', firstName: 'Marie', lastName: 'Dupont', phone: '0611111111' },
        { id: 'cli_2', firstName: 'Julie', lastName: 'Martin', lashMaps: [{ id: 'lm_1' }] },
      ],
    };

    const result = migrate(v1State, 1);

    expect(result.clients).toHaveLength(2);
    expect(result.clients[0]).toMatchObject({ id: 'cli_1', firstName: 'Marie', lashMaps: [] });
    expect(result.clients[1]).toMatchObject({ id: 'cli_2', firstName: 'Julie' });
    expect(result.clients[1].lashMaps[0].id).toBe('lm_1');
  });

  it('convertit les Lash Maps de l’ancien modèle vers les secteurs', () => {
    const v3State = {
      clients: [
        {
          id: 'cli_1',
          firstName: 'Marie',
          lashMaps: [
            {
              id: 'lm_1',
              curl: 'D',
              thickness: '0.05',
              zonesLeft: ['9', '10', '11', '11'],
              zonesRight: ['9', '10', '11', '12'],
            },
          ],
        },
      ],
    };

    const [map] = migrate(v3State, 3).clients[0].lashMaps;

    expect(map.id).toBe('lm_1');
    // Quatre cases à l'ancien format, six secteurs au minimum désormais : le dégradé
    // est rééchantillonné, il n'est pas complété par des copies de la dernière valeur.
    expect(map.leftEye.zones.map((z) => z.length)).toEqual([9, 9.5, 10, 11, 11, 11]);
    expect(map.rightEye.zones.map((z) => z.length)).toEqual([9, 9.5, 10, 11, 11.5, 12]);
    expect(map.leftEye.global).toMatchObject({ curl: 'D', diameter: '0.05' });
    // Les champs de l'ancien modèle ne survivent pas à la conversion.
    expect(map.zonesLeft).toBeUndefined();
    expect(map.curl).toBeUndefined();
  });

  it("ne plante pas quand il n'y a aucune donnée persistée", () => {
    expect(migrate({}, 1).clients).toEqual([]);
    expect(migrate(null, 1).clients).toEqual([]);
  });
});
