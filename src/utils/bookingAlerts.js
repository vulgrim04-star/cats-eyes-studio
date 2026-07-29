/** Décision « faut-il alerter, et pour quoi ? », isolée du réseau et du DOM.
 *
 * Deux sources alimentent la même décision — l'abonnement temps réel Supabase quand il
 * fonctionne, et le sondage de repli quand il ne fonctionne pas — et elles se recoupent
 * forcément. C'est ici qu'on garantit qu'une même demande n'alerte qu'une seule fois,
 * et qu'une demande arrivée pendant que l'app était fermée alerte bien au retour.
 */

/** Nombre d'identifiants de demandes retenus. Au-delà, la date-repère suffit : ces
 *  identifiants ne servent qu'à départager deux demandes enregistrées à la même
 *  milliseconde, ce qui ne concerne jamais qu'une poignée de lignes récentes. */
const MEMORY = 60;

/** État vierge : `primed: false` signale qu'aucune lecture n'a encore eu lieu sur cet
 *  appareil. La première lecture ne doit rien annoncer — elle découvre l'existant, elle
 *  n'assiste pas à son arrivée. */
export function emptyWatermark() {
  return { primed: false, since: null, alerted: [] };
}

function timeOf(value) {
  const ms = Date.parse(value ?? '');
  return Number.isNaN(ms) ? null : ms;
}

export function requestName(row) {
  return `${row?.first_name ?? ''} ${row?.last_name ?? ''}`.trim() || 'Une cliente';
}

/** Compare les demandes en attente à ce qui a déjà été annoncé sur cet appareil.
 *
 * Renvoie les demandes à annoncer ET la nouvelle date-repère à mémoriser : l'appelant
 * enregistre toujours la seconde, même quand la première est vide, sinon un rafraîchis-
 * sement sans nouveauté laisserait le repère en arrière et la demande suivante serait
 * annoncée deux fois.
 */
export function selectNewRequests(rows, watermark = emptyWatermark()) {
  const { primed = false, since = null, alerted = [] } = watermark ?? {};
  const known = new Set(alerted);
  const sinceMs = timeOf(since);
  const list = Array.isArray(rows) ? rows.filter((row) => row?.id) : [];

  const fresh = primed
    ? list.filter((row) => {
        if (known.has(row.id)) return false;
        const created = timeOf(row.created_at);
        // Une ligne sans date exploitable est traitée comme nouvelle : mieux vaut une
        // alerte de trop qu'un rendez-vous manqué.
        if (created === null) return true;
        // Comparaison large : deux demandes peuvent porter la même date-repère à la
        // milliseconde près. Les lignes déjà vues sont exclues par leur identifiant
        // juste au-dessus, jamais par cette date — elle ne sert qu'à écarter l'arriéré
        // antérieur à la mémoire des identifiants.
        return sinceMs === null || created >= sinceMs;
      })
    : [];

  const stamps = list.map((row) => timeOf(row.created_at)).filter((ms) => ms !== null);
  const latest = Math.max(sinceMs ?? Number.NEGATIVE_INFINITY, ...stamps);

  return {
    fresh,
    watermark: {
      primed: true,
      since: Number.isFinite(latest) ? new Date(latest).toISOString() : since,
      // Les identifiants des demandes encore en attente restent mémorisés : elles
      // reviennent à chaque lecture tant qu'elles ne sont ni confirmées ni refusées.
      alerted: [...new Set([...alerted, ...list.map((row) => row.id)])].slice(-MEMORY),
    },
  };
}

/** Texte de l'alerte. Groupé au-delà d'une demande : au retour d'une journée sans
 *  connexion, quatre notifications empilées se chassent l'une l'autre sur un téléphone. */
export function alertText(fresh) {
  if (fresh.length === 1) {
    const row = fresh[0];
    const when = [row.date, row.time].filter(Boolean).join(' à ');
    return {
      title: 'Nouvelle demande de réservation',
      body: [requestName(row), [row.service_name, when].filter(Boolean).join(' · ')]
        .filter(Boolean)
        .join(' — '),
    };
  }
  return {
    title: `${fresh.length} nouvelles demandes de réservation`,
    body: fresh.map(requestName).join(', '),
  };
}
