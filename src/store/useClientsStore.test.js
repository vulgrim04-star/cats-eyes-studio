import { describe, expect, it } from 'vitest';
import { useClientsStore } from './useClientsStore';

// Régression : la migration v1 -> v2 remplaçait autrefois silencieusement les clientes
// réelles d'un compte par les données de démo (voir migrate() dans useClientsStore.js).
describe('useClientsStore migrate (v1 -> v2)', () => {
  const migrate = useClientsStore.persist.getOptions().migrate;

  it('préserve les fiches clientes déjà persistées et ajoute lashMaps: []', () => {
    const v1State = {
      clients: [
        { id: 'cli_1', firstName: 'Marie', lastName: 'Dupont', phone: '0611111111' },
        { id: 'cli_2', firstName: 'Julie', lastName: 'Martin', lashMaps: [{ id: 'lm_1' }] },
      ],
    };

    const result = migrate(v1State, 1);

    expect(result.clients).toHaveLength(2);
    expect(result.clients[0]).toMatchObject({ id: 'cli_1', firstName: 'Marie', lashMaps: [] });
    expect(result.clients[1].lashMaps).toEqual([{ id: 'lm_1' }]);
  });

  it("ne plante pas quand il n'y a aucune donnée persistée", () => {
    expect(migrate({}, 1).clients).toEqual([]);
    expect(migrate(null, 1).clients).toEqual([]);
  });
});
