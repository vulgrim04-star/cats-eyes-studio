import { describe, expect, it } from 'vitest';
import { alertText, emptyWatermark, requestName, selectNewRequests } from './bookingAlerts';

const request = (id, createdAt, extra = {}) => ({
  id,
  created_at: createdAt,
  first_name: 'Léa',
  last_name: 'Martin',
  service_name: 'Volume russe',
  date: '2026-08-03',
  time: '14:00',
  ...extra,
});

describe('selectNewRequests', () => {
  it("n'annonce rien à la toute première lecture, mais retient ce qu'elle a vu", () => {
    const rows = [request('a', '2026-07-28T09:00:00Z'), request('b', '2026-07-28T10:00:00Z')];
    const { fresh, watermark } = selectNewRequests(rows, emptyWatermark());

    expect(fresh).toEqual([]);
    expect(watermark.primed).toBe(true);
    expect(watermark.since).toBe('2026-07-28T10:00:00.000Z');
  });

  it('annonce une demande arrivée après la dernière lecture', () => {
    const first = selectNewRequests([request('a', '2026-07-28T09:00:00Z')], emptyWatermark());
    const { fresh } = selectNewRequests(
      [request('a', '2026-07-28T09:00:00Z'), request('b', '2026-07-28T11:00:00Z')],
      first.watermark
    );

    expect(fresh.map((r) => r.id)).toEqual(['b']);
  });

  it("n'annonce jamais deux fois la même demande, même si elle reste en attente", () => {
    const first = selectNewRequests([request('a', '2026-07-28T09:00:00Z')], emptyWatermark());
    const second = selectNewRequests([request('a', '2026-07-28T09:00:00Z'), request('b', '2026-07-28T11:00:00Z')], first.watermark);
    const third = selectNewRequests([request('a', '2026-07-28T09:00:00Z'), request('b', '2026-07-28T11:00:00Z')], second.watermark);

    expect(second.fresh.map((r) => r.id)).toEqual(['b']);
    expect(third.fresh).toEqual([]);
  });

  // Le sondage et l'abonnement temps réel livrent la même demande à quelques
  // millisecondes d'intervalle : sans cette garantie, chaque réservation sonnerait deux fois.
  it('départage deux demandes enregistrées à la même milliseconde', () => {
    const first = selectNewRequests([request('a', '2026-07-28T09:00:00Z')], emptyWatermark());
    const both = selectNewRequests(
      [request('a', '2026-07-28T09:00:00Z'), request('b', '2026-07-28T09:00:00Z')],
      first.watermark
    );

    expect(both.fresh.map((r) => r.id)).toEqual(['b']);
    expect(selectNewRequests([request('a', '2026-07-28T09:00:00Z'), request('b', '2026-07-28T09:00:00Z')], both.watermark).fresh).toEqual([]);
  });

  // Cas du repère amorcé sur une liste vide : la toute première demande du salon ne doit
  // pas passer inaperçue sous prétexte qu'il n'y avait aucune date à retenir.
  it('annonce la première demande quand la lecture initiale ne trouvait rien', () => {
    const first = selectNewRequests([], emptyWatermark());
    expect(first.watermark.primed).toBe(true);
    expect(first.watermark.since).toBeNull();

    const { fresh } = selectNewRequests([request('a', '2026-07-28T09:00:00Z')], first.watermark);
    expect(fresh.map((r) => r.id)).toEqual(['a']);
  });

  it('annonce une ligne sans date exploitable plutôt que de la laisser filer', () => {
    const first = selectNewRequests([request('a', '2026-07-28T09:00:00Z')], emptyWatermark());
    const { fresh } = selectNewRequests(
      [request('a', '2026-07-28T09:00:00Z'), request('b', null)],
      first.watermark
    );

    expect(fresh.map((r) => r.id)).toEqual(['b']);
  });

  it('ne recule jamais la date-repère quand une lecture ne rapporte rien', () => {
    const first = selectNewRequests([request('a', '2026-07-28T09:00:00Z')], emptyWatermark());
    const empty = selectNewRequests([], first.watermark);

    expect(empty.watermark.since).toBe('2026-07-28T09:00:00.000Z');
  });

  it('résiste à une réponse absente ou malformée', () => {
    expect(selectNewRequests(null, emptyWatermark()).fresh).toEqual([]);
    expect(selectNewRequests([null, {}, request('a', '2026-07-28T09:00:00Z')], { primed: true, since: null, alerted: [] }).fresh.map((r) => r.id)).toEqual(['a']);
  });

  it('borne la mémoire des identifiants', () => {
    let watermark = emptyWatermark();
    for (let i = 0; i < 80; i += 1) {
      watermark = selectNewRequests([request(`r${i}`, `2026-07-28T09:${String(i).padStart(2, '0')}:00Z`)], watermark).watermark;
    }
    expect(watermark.alerted.length).toBeLessThanOrEqual(60);
  });
});

describe('alertText', () => {
  it('nomme la cliente, la prestation et le créneau pour une demande', () => {
    const { title, body } = alertText([request('a', '2026-07-28T09:00:00Z')]);
    expect(title).toBe('Nouvelle demande de réservation');
    expect(body).toBe('Léa Martin — Volume russe · 2026-08-03 à 14:00');
  });

  it('regroupe au-delà d’une demande', () => {
    const { title, body } = alertText([
      request('a', '2026-07-28T09:00:00Z'),
      request('b', '2026-07-28T10:00:00Z', { first_name: 'Chloé', last_name: 'Bernard' }),
    ]);
    expect(title).toBe('2 nouvelles demandes de réservation');
    expect(body).toBe('Léa Martin, Chloé Bernard');
  });

  it('reste lisible quand la cliente n’a pas de nom exploitable', () => {
    expect(requestName({ first_name: '', last_name: null })).toBe('Une cliente');
    expect(alertText([{ id: 'x', date: '2026-08-03', time: '14:00' }]).body).toBe('Une cliente — 2026-08-03 à 14:00');
  });
});
