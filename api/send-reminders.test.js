import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Vérification de bout en bout du balayage, Supabase et Resend simulés.
//
// Ce que ce fichier protège vraiment : **le second passage ne doit rien renvoyer**. Le
// balayage repasse toutes les quinze minutes sur la même échéance tant que la fenêtre de
// rattrapage est ouverte ; si le verrou lâchait, une cliente recevrait le même rappel quatre
// fois par heure. C'est le défaut le plus coûteux du chantier, et le seul qu'un test unitaire
// de `dueReminders` ne peut pas attraper — il ne se voit qu'en enchaînant deux appels réels.

const state = { rows: [], log: new Set(), emails: [], resendOk: true, resendStatus: 200 };

const fakeSupabase = {
  from: (table) => {
    if (table === 'app_state') {
      return { select: () => ({ in: () => Promise.resolve({ data: state.rows, error: null }) }) };
    }
    return {
      insert: (row) => {
        const key = `${row.user_id}|${row.appointment_id}|${row.kind}`;
        if (state.log.has(key)) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
        state.log.add(key);
        return Promise.resolve({ error: null });
      },
      delete: () => {
        const filters = {};
        const chain = {
          eq: (col, value) => {
            filters[col] = value;
            return chain;
          },
          then: (resolve) => {
            state.log.delete(`${filters.user_id}|${filters.appointment_id}|${filters.kind}`);
            return Promise.resolve({ error: null }).then(resolve);
          },
        };
        return chain;
      },
    };
  },
};

vi.mock('./_lib/supabaseAdmin.js', () => ({
  hasSupabaseAdminConfig: () => true,
  getSupabaseAdmin: () => fakeSupabase,
}));

const { default: handler } = await import('./send-reminders.js');

/** Rendez-vous placé à `hoursFromNow` de maintenant, en heure murale UTC — le salon de test
 *  est en UTC, donc heure murale et instant coïncident. */
function appointmentAt(hoursFromNow) {
  const at = new Date(Date.now() + hoursFromNow * 3600_000);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    id: 'apt_1',
    clientId: 'cli_1',
    serviceId: 'svc_1',
    date: `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`,
    time: `${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`,
    duration: 90,
    status: 'confirmed',
  };
}

function seed({ hoursFromNow = 24, notifications = { reminder24h: true, reminder2h: true }, clientEmail = 'lea@example.com' } = {}) {
  state.rows = [
    {
      user_id: 'salon-1',
      store_key: 'ces-settings',
      data: { state: { salon: { name: "Cat's Eyes", address: '3 rue du Lac', timezone: 'UTC' }, notifications } },
    },
    { user_id: 'salon-1', store_key: 'ces-appointments', data: { state: { appointments: [appointmentAt(hoursFromNow)] } } },
    {
      user_id: 'salon-1',
      store_key: 'ces-clients',
      data: { state: { clients: [{ id: 'cli_1', firstName: 'Léa', lastName: 'Martin', email: clientEmail }] } },
    },
    { user_id: 'salon-1', store_key: 'ces-services', data: { state: { services: [{ id: 'svc_1', name: 'Volume russe' }] } } },
  ];
}

async function call(authorization = 'Bearer secret-test') {
  let payload;
  const res = { status: () => res, json: (body) => { payload = body; return res; } };
  await handler({ method: 'POST', headers: { authorization } }, res);
  return payload;
}

beforeEach(() => {
  state.log = new Set();
  state.emails = [];
  state.resendOk = true;
  state.resendStatus = 200;
  seed();

  process.env.CRON_SECRET = 'secret-test';
  process.env.RESEND_API_KEY = 'cle-resend';
  process.env.RESEND_FROM = "Cat's Eyes <studio@cats-eyes.ch>";

  vi.spyOn(console, 'error').mockImplementation(() => {});
  globalThis.fetch = vi.fn(async (_url, init) => {
    state.emails.push(JSON.parse(init.body));
    return { ok: state.resendOk, status: state.resendStatus, text: async () => 'erreur simulée' };
  });
});

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM;
  vi.restoreAllMocks();
});

describe('autorisation', () => {
  it('refuse un secret erroné', async () => {
    expect(await call('Bearer mauvais')).toEqual({ ok: false, reason: 'unauthorized' });
    expect(state.emails).toHaveLength(0);
  });

  it('refuse une requête sans en-tête', async () => {
    expect(await call('')).toEqual({ ok: false, reason: 'unauthorized' });
  });

  // Un endpoint qui expédie de vrais e-mails à de vraies clientes ne doit jamais tourner
  // à découvert : sans secret configuré, il refuse tout, y compris une requête sans en-tête.
  it('refuse tout quand CRON_SECRET n’est pas configuré', async () => {
    delete process.env.CRON_SECRET;
    expect(await call('Bearer ')).toEqual({ ok: false, reason: 'unauthorized' });
    expect(state.emails).toHaveLength(0);
  });

  it('rejette une méthode non prévue', async () => {
    let payload;
    const res = { status: () => res, json: (b) => { payload = b; return res; } };
    await handler({ method: 'DELETE', headers: {} }, res);
    expect(payload).toEqual({ ok: false, reason: 'method-not-allowed' });
  });
});

describe('envoi', () => {
  it('envoie le rappel 24h à la cliente', async () => {
    const result = await call();
    expect(result).toMatchObject({ ok: true, sent: 1, failed: 0 });
    expect(state.emails).toHaveLength(1);
    expect(state.emails[0].to).toEqual(['lea@example.com']);
    expect(state.emails[0].subject).toContain('demain');
    expect(state.emails[0].html).toContain('Volume russe');
    expect(state.emails[0].html).toContain('3 rue du Lac');
  });

  it('envoie le rappel 2h avec la bonne échéance annoncée', async () => {
    seed({ hoursFromNow: 2 });
    await call();
    expect(state.emails[0].subject).toContain('dans deux heures');
  });

  // LE test du chantier.
  it('n’envoie rien au second passage', async () => {
    const first = await call();
    const second = await call();

    expect(first).toMatchObject({ sent: 1 });
    expect(second).toMatchObject({ sent: 0, skipped: 1 });
    expect(state.emails).toHaveLength(1);
  });

  it('réessaie au passage suivant si l’envoi a échoué', async () => {
    state.resendOk = false;
    state.resendStatus = 500;
    const failed = await call();
    expect(failed).toMatchObject({ sent: 0, failed: 1 });

    // La réservation a été libérée : le rappel doit repartir, pas rester bloqué.
    state.resendOk = true;
    state.resendStatus = 200;
    expect(await call()).toMatchObject({ sent: 1 });
  });

  it('respecte une bascule désactivée', async () => {
    seed({ notifications: { reminder24h: false, reminder2h: false } });
    expect(await call()).toMatchObject({ ok: true, sent: 0 });
    expect(state.emails).toHaveLength(0);
  });

  it('ignore une cliente sans adresse e-mail', async () => {
    seed({ clientEmail: '' });
    expect(await call()).toMatchObject({ ok: true, sent: 0 });
  });

  it('n’envoie rien pour un rendez-vous encore lointain', async () => {
    seed({ hoursFromNow: 72 });
    expect(await call()).toMatchObject({ ok: true, sent: 0 });
  });
});

describe('configuration incomplète', () => {
  it('s’arrête proprement sans clé Resend, sans rien réserver', async () => {
    delete process.env.RESEND_API_KEY;
    expect(await call()).toMatchObject({ ok: false, reason: 'missing-resend-key' });
    // Rien ne doit avoir été journalisé : sinon le rappel serait perdu pour de bon une fois
    // la clé ajoutée.
    expect(state.log.size).toBe(0);
  });
});
