import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claimReminder, releaseReminder } from './reminderLog.js';

// Ce module ne fait presque rien, mais ce presque rien est le seul rempart entre une cliente
// et deux e-mails identiques. Ce qui compte n'est pas qu'il insère une ligne, c'est ce qu'il
// DÉCIDE face à chaque réponse de la base — d'où un faux client Supabase plutôt qu'une vraie
// connexion.

function fakeSupabase({ insertError = null, deleteError = null } = {}) {
  const inserted = [];
  const deleted = [];
  return {
    inserted,
    deleted,
    from: (table) => ({
      insert: (row) => {
        inserted.push({ table, row });
        return Promise.resolve({ error: insertError });
      },
      delete: () => {
        const filters = {};
        const chain = {
          eq: (column, value) => {
            filters[column] = value;
            return chain;
          },
          then: (resolve) => {
            deleted.push({ table, filters });
            return Promise.resolve({ error: deleteError }).then(resolve);
          },
        };
        return chain;
      },
    }),
  };
}

const target = { userId: 'user-1', appointmentId: 'apt_1', kind: '24h' };

let warn;
beforeEach(() => {
  warn = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('claimReminder', () => {
  it('réserve l’envoi quand personne ne l’a encore fait', async () => {
    const supabase = fakeSupabase();
    await expect(claimReminder(supabase, target)).resolves.toBe(true);
    expect(supabase.inserted).toEqual([
      { table: 'reminder_log', row: { user_id: 'user-1', appointment_id: 'apt_1', kind: '24h' } },
    ]);
  });

  // Le cas nominal du balayage : il repasse toutes les quinze minutes sur la même échéance
  // tant que la fenêtre de rattrapage est ouverte. Sans ce refus, la cliente recevrait le
  // même rappel toutes les quinze minutes.
  it('refuse quand la contrainte d’unicité a déjà été prise (23505)', async () => {
    const supabase = fakeSupabase({ insertError: { code: '23505', message: 'duplicate key' } });
    await expect(claimReminder(supabase, target)).resolves.toBe(false);
  });

  // Sans journal utilisable, envoyer serait pire que ne rien faire : chaque passage
  // renverrait le même e-mail, sans jamais pouvoir s'en souvenir.
  it.each([
    ['table absente', { code: 'PGRST205', message: 'relation does not exist' }],
    ['base injoignable', { code: '08006', message: 'connection failure' }],
    ['erreur sans code', { message: 'boom' }],
  ])('refuse d’envoyer si le journal est inutilisable — %s', async (_label, insertError) => {
    const supabase = fakeSupabase({ insertError });
    await expect(claimReminder(supabase, target)).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});

describe('releaseReminder', () => {
  it('retire la réservation pour qu’un passage ultérieur réessaie', async () => {
    const supabase = fakeSupabase();
    await releaseReminder(supabase, target);
    expect(supabase.deleted).toEqual([
      { table: 'reminder_log', filters: { user_id: 'user-1', appointment_id: 'apt_1', kind: '24h' } },
    ]);
  });

  // La libération est un filet, pas un chemin critique : si elle échoue, le rappel ne
  // repartira pas — mais rien ne doit lever pour autant, le balayage doit continuer sur les
  // autres comptes.
  it('journalise sans lever quand la suppression échoue', async () => {
    const supabase = fakeSupabase({ deleteError: { message: 'nope' } });
    await expect(releaseReminder(supabase, target)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
