let counter = 0;

export function createId(prefix = 'id') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

/** UUID v4, y compris hors contexte sécurisé.
 *
 * `crypto.randomUUID` n'existe QUE dans un contexte sécurisé — HTTPS ou localhost. Sur
 * `http://192.168.x.x:5173`, c'est-à-dire précisément quand on ouvre l'application depuis
 * son téléphone sur le réseau local pour la tester, la propriété est absente et l'appel lève
 * une TypeError. `getRandomValues`, lui, reste disponible partout : on reconstruit donc
 * l'UUID à la main plutôt que de renoncer à l'aléa cryptographique — le jeton du flux
 * calendrier en dépend, et `createId` ci-dessus, prévisible, ne conviendrait pas. */
export function newUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Dernier recours : navigateur sans Web Crypto. Jamais utilisé comme secret dans ce cas.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
