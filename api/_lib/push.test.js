import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `web-push` parle au réseau : on le remplace pour vérifier ce qui compte ici, c'est-à-dire
// la RAISON renvoyée dans chaque situation. C'est elle que Paramètres traduit en phrase
// pour la salonnière : une raison fausse et le diagnostic envoie chercher au mauvais endroit.
const sendNotification = vi.fn();
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: (...args) => sendNotification(...args) },
}));

const { sendPushToUser, hasVapidConfig, vapidKeysMatch } = await import('./push.js');

/** Faux client Supabase, limité aux deux usages du module : lire les abonnements d'une
 *  utilisatrice et supprimer ceux que le navigateur a révoqués. */
function fakeSupabase({ subs = [], error = null } = {}) {
  const deleted = [];
  return {
    deleted,
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: subs, error }) }),
      delete: () => ({
        eq: (_col, value) => {
          deleted.push(value);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  };
}

const sub = (id) => ({ id, endpoint: `https://push.example/${id}`, p256dh: 'p', auth: 'a' });
const payload = { title: 'T', body: 'B', url: '/agenda' };

beforeEach(() => {
  sendNotification.mockReset();
  process.env.VAPID_PUBLIC_KEY = 'cle-publique';
  process.env.VAPID_PRIVATE_KEY = 'cle-privee';
});

afterEach(() => {
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VITE_VAPID_PUBLIC_KEY;
});

// La même clé publique doit être déclarée deux fois dans Vercel. Quand les deux diffèrent,
// chaque envoi est refusé par un 403 alors que tous les autres contrôles restent verts :
// c'est la panne la plus difficile à voir de toute la chaîne.
describe('vapidKeysMatch', () => {
  it('accepte deux clés identiques', () => {
    process.env.VITE_VAPID_PUBLIC_KEY = 'cle-publique';
    expect(vapidKeysMatch()).toBe(true);
  });

  it('tolère le padding et les espaces d’un copier-coller', () => {
    process.env.VAPID_PUBLIC_KEY = 'cle-publique==';
    process.env.VITE_VAPID_PUBLIC_KEY = '  cle-publique  ';
    expect(vapidKeysMatch()).toBe(true);
  });

  it('refuse deux clés qui ne se correspondent pas', () => {
    process.env.VITE_VAPID_PUBLIC_KEY = 'une-autre-cle';
    expect(vapidKeysMatch()).toBe(false);
  });

  it('détecte une clé tronquée d’un seul caractère', () => {
    process.env.VITE_VAPID_PUBLIC_KEY = 'cle-publiqu';
    expect(vapidKeysMatch()).toBe(false);
  });

  // Une clé absente est déjà signalée par son propre contrôle : ce test-ci ne doit pas
  // prétendre trancher, sinon deux lignes du diagnostic accuseraient la même cause.
  it('ne se prononce pas quand une des deux clés manque', () => {
    expect(vapidKeysMatch()).toBeNull();
    process.env.VITE_VAPID_PUBLIC_KEY = 'cle-publique';
    delete process.env.VAPID_PUBLIC_KEY;
    expect(vapidKeysMatch()).toBeNull();
  });
});

describe('hasVapidConfig', () => {
  it("exige les deux clés, pas seulement l'une", () => {
    expect(hasVapidConfig()).toBe(true);
    delete process.env.VAPID_PRIVATE_KEY;
    expect(hasVapidConfig()).toBe(false);
  });
});

describe('sendPushToUser', () => {
  it("nomme les clés manquantes plutôt que d'échouer en silence", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    const result = await sendPushToUser(fakeSupabase(), 'u1', payload);
    expect(result).toEqual({ sent: false, reason: 'missing-server-keys', count: 0 });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  // Le cas le plus courant en pratique : le serveur est prêt, mais aucun téléphone n'a
  // jamais réussi à s'abonner. Sans cette distinction, on cherche le problème côté serveur.
  it('distingue « aucun appareil abonné » d’une véritable erreur de lecture', async () => {
    expect(await sendPushToUser(fakeSupabase({ subs: [] }), 'u1', payload)).toEqual({
      sent: false,
      reason: 'no-subscription',
      count: 0,
    });
    expect(await sendPushToUser(fakeSupabase({ error: { message: 'boom' } }), 'u1', payload)).toEqual({
      sent: false,
      reason: 'query-error',
      count: 0,
    });
  });

  it('compte les envois réussis sur plusieurs appareils', async () => {
    sendNotification.mockResolvedValue({});
    const result = await sendPushToUser(fakeSupabase({ subs: [sub('a'), sub('b')] }), 'u1', payload);
    expect(result).toEqual({ sent: true, reason: 'sent', count: 2 });
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it('reste un succès si un seul appareil sur deux répond', async () => {
    sendNotification.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }));
    sendNotification.mockResolvedValueOnce({});
    const supabase = fakeSupabase({ subs: [sub('mort'), sub('vivant')] });
    const result = await sendPushToUser(supabase, 'u1', payload);
    expect(result.sent).toBe(true);
    expect(result.count).toBe(1);
  });

  it('supprime un abonnement révoqué par le navigateur (404/410)', async () => {
    sendNotification.mockRejectedValue(Object.assign(new Error('gone'), { statusCode: 410 }));
    const supabase = fakeSupabase({ subs: [sub('mort')] });
    const result = await sendPushToUser(supabase, 'u1', payload);
    expect(result.reason).toBe('send-failed');
    expect(supabase.deleted).toEqual(['mort']);
  });

  // Un 403 signale une clé VAPID qui ne correspond plus à l'abonnement. Le supprimer
  // masquerait une erreur de configuration : l'abonnement doit rester, pour que le
  // rattrapage côté navigateur (matchesCurrentKey dans src/utils/push.js) le remplace.
  // Et la raison doit le NOMMER : « envoi refusé » ferait chercher sur le téléphone, alors
  // que la correction est dans les variables d'environnement.
  it('nomme la discordance de clés sur un 403, et conserve l’abonnement', async () => {
    sendNotification.mockRejectedValue(Object.assign(new Error('forbidden'), { statusCode: 403 }));
    const supabase = fakeSupabase({ subs: [sub('mauvaise-cle')] });
    const result = await sendPushToUser(supabase, 'u1', payload);
    expect(result).toEqual({ sent: false, reason: 'key-mismatch', count: 0 });
    expect(supabase.deleted).toEqual([]);
  });

  it('reste sur un échec générique pour les autres refus', async () => {
    sendNotification.mockRejectedValue(Object.assign(new Error('too big'), { statusCode: 413 }));
    const result = await sendPushToUser(fakeSupabase({ subs: [sub('a')] }), 'u1', payload);
    expect(result.reason).toBe('send-failed');
  });

  // Un seul appareil en 403 parmi plusieurs ne doit pas masquer les envois réussis.
  it('reste un succès si un appareil refuse en 403 mais qu’un autre reçoit', async () => {
    sendNotification.mockRejectedValueOnce(Object.assign(new Error('forbidden'), { statusCode: 403 }));
    sendNotification.mockResolvedValueOnce({});
    const result = await sendPushToUser(fakeSupabase({ subs: [sub('vieux'), sub('bon')] }), 'u1', payload);
    expect(result).toEqual({ sent: true, reason: 'sent', count: 1 });
  });
});
