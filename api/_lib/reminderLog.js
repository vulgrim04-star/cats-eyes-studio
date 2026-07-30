/** Le verrou qui empêche une cliente de recevoir deux fois le même rappel.
 *
 *  Le balayage passe toutes les quinze minutes et rattrape les échéances manquées sur
 *  plusieurs heures : sans verrou, chaque passage renverrait exactement les mêmes e-mails.
 *  Il ne suffit pas de « vérifier avant d'envoyer » — deux exécutions qui se chevauchent
 *  liraient toutes les deux « pas encore envoyé » et enverraient toutes les deux.
 *
 *  La garantie vient donc de la base, pas du code : la contrainte `unique (user_id,
 *  appointment_id, kind)` de `reminder_log` fait échouer la seconde réservation. C'est le
 *  seul mécanisme qui résiste à la concurrence.
 *
 *  D'où l'ordre — RÉSERVER, puis envoyer, et libérer si l'envoi échoue :
 *
 *    1. `claimReminder` insère la ligne. Conflit ⇒ quelqu'un d'autre s'en occupe, on passe.
 *    2. Envoi de l'e-mail.
 *    3. Échec ⇒ `releaseReminder` retire la ligne, pour qu'un passage ultérieur réessaie.
 *
 *  L'ordre inverse (envoyer puis journaliser) rouvrirait la porte au doublon à chaque
 *  reprise de l'ordonnanceur. Entre « une cliente reçoit deux fois le même rappel » et
 *  « un rappel est perdu parce que le serveur est tombé entre l'insertion et l'envoi », le
 *  second est le moins mauvais : il est rare, silencieux, et sans conséquence pour elle. */

/** Code d'erreur PostgreSQL d'une violation de contrainte d'unicité. */
const UNIQUE_VIOLATION = '23505';

/** Tente de réserver l'envoi. `true` ⇒ c'est à nous de l'envoyer, et à personne d'autre. */
export async function claimReminder(supabase, { userId, appointmentId, kind }) {
  const { error } = await supabase
    .from('reminder_log')
    .insert({ user_id: userId, appointment_id: appointmentId, kind });

  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION) return false; // Déjà envoyé, ou en cours ailleurs.

  // Table absente (PGRST205) ou base injoignable : on refuse d'envoyer plutôt que de le
  // faire sans pouvoir s'en souvenir. Sans le journal, chaque passage renverrait le même
  // e-mail toutes les quinze minutes — bien pire qu'un rappel manquant.
  console.error('[reminders] réservation impossible, envoi annulé', error);
  return false;
}

/** Libère une réservation dont l'envoi a échoué, pour qu'un passage ultérieur réessaie. */
export async function releaseReminder(supabase, { userId, appointmentId, kind }) {
  const { error } = await supabase
    .from('reminder_log')
    .delete()
    .eq('user_id', userId)
    .eq('appointment_id', appointmentId)
    .eq('kind', kind);

  // Sans conséquence immédiate : le rappel ne repartira simplement pas. On le journalise
  // pour que la cause soit trouvable si le cas se répète.
  if (error) console.error('[reminders] libération de la réservation en échec', error);
}
