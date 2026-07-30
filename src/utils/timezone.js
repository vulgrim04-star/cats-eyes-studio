/** Conversion d'une heure MURALE (« mardi 14h ») en instant absolu.
 *
 *  Pourquoi ce module existe : un rendez-vous est enregistré en heure flottante — `date`
 *  et `time`, sans fuseau — parce que c'est la seule forme honnête pour un salon qui n'a
 *  jamais déclaré le sien. Cela suffit à afficher un agenda, et même à produire un flux
 *  `.ics` (le logiciel de calendrier applique le fuseau de sa propriétaire).
 *
 *  Cela ne suffit plus dès qu'un serveur doit décider QUAND envoyer un rappel : « 24h avant
 *  mardi 14h » n'est pas une date tant qu'on ignore de quel 14h on parle. Le balayage tourne
 *  en UTC ; sans conversion, un salon en Suisse verrait ses rappels partir avec une ou deux
 *  heures d'écart selon la saison — l'erreur exacte que l'heure d'été introduit.
 *
 *  Aucune dépendance ajoutée : `Intl` sait déjà faire l'essentiel, à condition de le prendre
 *  dans le bon sens (voir `offsetMsAt`). */

const DEFAULT_TIME_ZONE = 'Europe/Zurich';

/** Fuseau de repli. Le domaine du projet est `cats-eyes.ch` : c'est le pari le moins mauvais
 *  pour un compte créé avant que le fuseau ne soit demandé, et il reste corrigeable dans
 *  Paramètres. */
export const FALLBACK_TIME_ZONE = DEFAULT_TIME_ZONE;

/** Le fuseau de cet appareil, pour pré-remplir l'inscription. Repli sur la valeur par défaut
 *  si le navigateur ne le donne pas (très ancien, ou paramètre régional exotique). */
export function detectTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Un fuseau qu'`Intl` accepte réellement ? Une chaîne inventée fait lever `DateTimeFormat`,
 *  et on ne veut pas qu'un fuseau mal saisi fasse échouer tout un balayage. */
export function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Fuseaux proposés dans Paramètres. Volontairement courte : une gérante ne change pas de
 *  fuseau, elle corrige tout au plus une détection fausse — dérouler les 400 identifiants
 *  IANA ne l'aiderait en rien. La valeur déjà enregistrée et celle de l'appareil sont
 *  toujours ajoutées, pour qu'un fuseau hors liste reste sélectionnable au lieu de
 *  disparaître silencieusement du sélecteur (et d'être écrasé au premier enregistrement). */
export function timeZoneOptions(current) {
  const common = [
    'Europe/Zurich',
    'Europe/Paris',
    'Europe/Brussels',
    'Europe/Luxembourg',
    'Europe/London',
    'America/Montreal',
    'UTC',
  ];
  return [...new Set([current, detectTimeZone(), ...common].filter(isValidTimeZone))];
}

const partsFormatter = (timeZone) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/** Décalage du fuseau, en millisecondes, à un INSTANT donné.
 *
 *  `Intl` ne sait répondre qu'à la question « quelle heure murale à cet instant ? », jamais
 *  l'inverse. On la lui pose donc dans ce sens, et on mesure l'écart entre l'heure murale
 *  obtenue et l'instant de départ : cet écart EST le décalage en vigueur à ce moment-là,
 *  heure d'été comprise. */
function offsetMsAt(instant, timeZone) {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const at = {};
  for (const { type, value } of parts) {
    if (type !== 'literal') at[type] = Number(value);
  }
  // `hour` vaut 24 à minuit dans certaines implémentations de `hour12: false`.
  const hour = at.hour === 24 ? 0 : at.hour;
  const asUtc = Date.UTC(at.year, at.month - 1, at.day, hour, at.minute, at.second);
  // Les millisecondes de l'instant sont perdues par le formatage : on les remet, sinon le
  // décalage calculé porterait un résidu qui n'a rien d'un décalage de fuseau.
  return asUtc - (instant.getTime() - instant.getMilliseconds());
}

/** L'instant absolu correspondant à `date` + `time` lues dans `timeZone`.
 *
 *  Renvoie `null` plutôt qu'une `Invalid Date` quand l'entrée n'est pas exploitable : un
 *  rendez-vous à moitié saisi doit être écarté, jamais transformé en `NaN` qui se propage.
 *
 *  @param date     'AAAA-MM-JJ'
 *  @param time     'HH:MM'
 *  @param timeZone identifiant IANA, ex. 'Europe/Zurich' */
export function zonedDateTimeToUtc(date, time, timeZone = DEFAULT_TIME_ZONE) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof time !== 'string' || !/^\d{1,2}:\d{2}$/.test(time)) return null;

  const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (hour > 23 || minute > 59) return null;

  // Première approximation : on lit l'heure murale comme si elle était en UTC.
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Le décalage dépend de l'instant, et l'instant est justement ce qu'on cherche : on
  // applique donc la correction deux fois. La seconde passe n'a d'effet que lorsque la
  // première tombe du mauvais côté d'une bascule d'heure d'été — soit deux fois l'an, mais
  // ce sont précisément les jours où un rappel partirait avec une heure d'écart.
  let instant = naive - offsetMsAt(new Date(naive), zone);
  instant = naive - offsetMsAt(new Date(instant), zone);

  return new Date(instant);
}
