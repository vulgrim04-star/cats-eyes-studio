import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  KIND,
  activeNotifications,
  deriveNotifications,
  historyNotifications,
  mergeNotifications,
  unreadCount,
} from './notificationFeed';

const T1 = '2026-07-30T08:00:00.000Z';
const T2 = '2026-07-30T09:00:00.000Z';
const T3 = '2026-07-30T10:00:00.000Z';

const booking = (id) => ({ id, first_name: 'Léa', last_name: 'Martin', service_name: 'Volume russe', date: '2026-08-05', time: '14:00' });
const rdv = (id) => ({ id, client: { firstName: 'Chloé', lastName: 'Girard' }, service: { name: 'Pose classique' }, date: '2026-07-19', time: '13:30' });
const produit = (id) => ({ id, name: 'Colle noire', stock: 1, stockMin: 3 });

describe('deriveNotifications', () => {
  it('produit une alerte par source, avec un identifiant qui la désigne', () => {
    const list = deriveNotifications({
      bookingRequests: [booking('b1')],
      pendingAppointments: [rdv('a1')],
      lowStock: [produit('p1')],
    });

    expect(list.map((n) => n.id)).toEqual(['booking:b1', 'appointment:a1', 'stock:p1']);
    expect(list.map((n) => n.kind)).toEqual([KIND.booking, KIND.appointment, KIND.stock]);
  });

  it('nomme la cliente, la prestation et le créneau', () => {
    const [alerte] = deriveNotifications({ bookingRequests: [booking('b1')] });
    expect(alerte.title).toBe('Léa Martin — demande de RDV');
    expect(alerte.body).toBe('Volume russe · 2026-08-05 à 14:00');
    expect(alerte.href).toBe('/');
  });

  it('reste lisible sur une fiche incomplète', () => {
    const [alerte] = deriveNotifications({ pendingAppointments: [{ id: 'a1', date: '2026-07-19', time: '13:30' }] });
    expect(alerte.title).toBe('Une cliente — RDV à confirmer');
    expect(alerte.title).not.toContain('undefined');
  });

  // L'identifiant doit être STABLE : c'est lui qui permet de reconnaître une alerte déjà vue
  // au lieu d'en recréer une neuve à chaque calcul.
  it('donne le même identifiant à deux calculs successifs', () => {
    const args = { bookingRequests: [booking('b1')], pendingAppointments: [rdv('a1')] };
    expect(deriveNotifications(args).map((n) => n.id)).toEqual(deriveNotifications(args).map((n) => n.id));
  });

  it('ne produit rien sans données', () => {
    expect(deriveNotifications()).toEqual([]);
    expect(deriveNotifications({})).toEqual([]);
  });
});

describe('mergeNotifications', () => {
  const derive = (ids) => ids.map((id) => ({ id, kind: KIND.booking, title: id, body: '', href: '/' }));

  it('fait entrer une alerte inconnue en non-lue, datée du moment où on la découvre', () => {
    const [alerte] = mergeNotifications([], derive(['booking:b1']), T1);
    expect(alerte).toMatchObject({ id: 'booking:b1', createdAt: T1, readAt: null, dismissedAt: null, resolvedAt: null });
  });

  it('conserve l’état de lecture d’un calcul à l’autre', () => {
    const first = mergeNotifications([], derive(['booking:b1']), T1);
    const read = first.map((n) => ({ ...n, readAt: T2 }));
    const second = mergeNotifications(read, derive(['booking:b1']), T3);

    expect(second[0].readAt).toBe(T2);
    expect(second[0].createdAt).toBe(T1);
  });

  // Le cœur de la demande : sans cette règle, « supprimer » ne durerait que jusqu'au
  // prochain rafraîchissement, tant que le rendez-vous n'est pas traité.
  it('ne fait jamais revenir une alerte supprimée dont la source existe encore', () => {
    const first = mergeNotifications([], derive(['booking:b1']), T1);
    const dismissed = first.map((n) => ({ ...n, dismissedAt: T2 }));
    const second = mergeNotifications(dismissed, derive(['booking:b1']), T3);

    expect(second).toHaveLength(1);
    expect(second[0].dismissedAt).toBe(T2);
    expect(activeNotifications(second)).toEqual([]);
    expect(historyNotifications(second)).toEqual([]);
  });

  it('résout une alerte dont la source a disparu, et la garde en historique', () => {
    const first = mergeNotifications([], derive(['booking:b1']), T1);
    const second = mergeNotifications(first, [], T2);

    expect(second[0].resolvedAt).toBe(T2);
    expect(activeNotifications(second)).toEqual([]);
    expect(historyNotifications(second).map((n) => n.id)).toEqual(['booking:b1']);
  });

  it('ne redate pas une alerte déjà résolue', () => {
    const first = mergeNotifications([], derive(['booking:b1']), T1);
    const resolved = mergeNotifications(first, [], T2);
    expect(mergeNotifications(resolved, [], T3)[0].resolvedAt).toBe(T2);
  });

  // Un rendez-vous refusé puis repris, un produit réapprovisionné puis de nouveau bas :
  // l'alerte doit redevenir active plutôt que rester enterrée dans l'historique.
  it('réactive une alerte résolue si sa source réapparaît', () => {
    const first = mergeNotifications([], derive(['stock:p1']), T1);
    const resolved = mergeNotifications(first, [], T2);
    const back = mergeNotifications(resolved, derive(['stock:p1']), T3);

    expect(back[0].resolvedAt).toBeNull();
    expect(activeNotifications(back).map((n) => n.id)).toEqual(['stock:p1']);
  });

  it('rafraîchit le contenu sans toucher à l’état', () => {
    const first = mergeNotifications([], [{ id: 'a', kind: KIND.appointment, title: 'ancien', body: 'x', href: '/agenda' }], T1);
    const read = first.map((n) => ({ ...n, readAt: T2 }));
    const second = mergeNotifications(read, [{ id: 'a', kind: KIND.appointment, title: 'déplacé', body: 'y', href: '/agenda' }], T3);

    expect(second[0].title).toBe('déplacé');
    expect(second[0].readAt).toBe(T2);
  });

  it('classe la plus récente en tête', () => {
    const first = mergeNotifications([], derive(['a']), T1);
    const second = mergeNotifications(first, derive(['a', 'b']), T2);
    expect(second.map((n) => n.id)).toEqual(['b', 'a']);
  });

  it('résiste à un état enregistré corrompu', () => {
    expect(mergeNotifications(null, derive(['a']), T1)).toHaveLength(1);
    expect(mergeNotifications([null, {}], derive(['a']), T1).map((n) => n.id)).toEqual(['a']);
  });
});

describe('purge de l’historique', () => {
  const many = (count, prefix) =>
    Array.from({ length: count }, (_, i) => ({
      id: `${prefix}${i}`,
      kind: KIND.stock,
      title: 't',
      body: '',
      href: '/stock',
      createdAt: new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString(),
      readAt: null,
      dismissedAt: null,
      resolvedAt: '2026-02-01T00:00:00.000Z',
    }));

  it('oublie les plus anciennes entrées déjà traitées au-delà de la limite', () => {
    const result = mergeNotifications(many(HISTORY_LIMIT + 40, 'vieux'), [], T1);
    expect(result.length).toBe(HISTORY_LIMIT);
    // Les plus récentes sont conservées.
    expect(result[0].id).toBe(`vieux${HISTORY_LIMIT + 39}`);
  });

  // Piège : purger une entrée supprimée dont la source vit encore la ferait réapparaître
  // au calcul suivant. Elle doit survivre à la purge.
  it('ne purge jamais une alerte supprimée dont la source est toujours là', () => {
    const vivante = {
      id: 'stock:vivant',
      kind: KIND.stock,
      title: 'Colle',
      body: '',
      href: '/stock',
      createdAt: '2020-01-01T00:00:00.000Z', // la plus ancienne de toutes
      readAt: null,
      dismissedAt: '2020-01-02T00:00:00.000Z',
      resolvedAt: null,
    };
    const derived = [{ id: 'stock:vivant', kind: KIND.stock, title: 'Colle', body: '', href: '/stock' }];

    const result = mergeNotifications([vivante, ...many(HISTORY_LIMIT + 40, 'vieux')], derived, T1);
    expect(result.find((n) => n.id === 'stock:vivant')).toBeDefined();
    expect(activeNotifications(result)).toEqual([]);
  });

  it('ne purge pas des alertes encore actives, même très nombreuses', () => {
    const derived = Array.from({ length: HISTORY_LIMIT + 30 }, (_, i) => ({
      id: `actif${i}`, kind: KIND.stock, title: 't', body: '', href: '/stock',
    }));
    expect(mergeNotifications([], derived, T1)).toHaveLength(HISTORY_LIMIT + 30);
  });
});

describe('unreadCount', () => {
  it('ne compte ni le lu, ni le supprimé, ni le traité', () => {
    const list = [
      { id: 'a', readAt: null, dismissedAt: null, resolvedAt: null },
      { id: 'b', readAt: T1, dismissedAt: null, resolvedAt: null },
      { id: 'c', readAt: null, dismissedAt: T1, resolvedAt: null },
      { id: 'd', readAt: null, dismissedAt: null, resolvedAt: T1 },
    ];
    expect(unreadCount(list)).toBe(1);
    expect(unreadCount([])).toBe(0);
  });
});
