// Adresse d'expédition des e-mails transactionnels.
//
// Par défaut on utilise le domaine de test `resend.dev`, qui fonctionne sans aucune
// configuration DNS — mais Resend n'accepte alors qu'UN SEUL destinataire : l'adresse du
// titulaire du compte Resend. Tout envoi vers une autre adresse est refusé (403). Autrement
// dit, sans domaine vérifié, la notification de réservation arrive (elle est adressée à la
// salonnière) mais la confirmation à la cliente échoue systématiquement.
//
// Pour envoyer à de vraies clientes : vérifier un domaine dans Resend (Domains → Add Domain),
// puis définir RESEND_FROM dans Vercel. Aucune modification de code n'est alors nécessaire.
const TEST_FROM = 'onboarding@resend.dev';

export function resendFrom(salonName) {
  const configured = process.env.RESEND_FROM?.trim();
  const address = configured || TEST_FROM;
  // RESEND_FROM accepte les deux formes : "studio@cats-eyes.com" ou
  // "Cat's Eyes Studio <studio@cats-eyes.com>". Si le nom est déjà là, on n'y touche pas.
  if (address.includes('<')) return address;
  return `${salonName || 'Votre institut'} <${address}>`;
}

/** True tant qu'aucun domaine vérifié n'est configuré — les envois sont alors limités à
 *  l'adresse du titulaire du compte Resend. Sert à journaliser un diagnostic utile plutôt
 *  qu'un 403 opaque. */
export function isTestSender() {
  return !process.env.RESEND_FROM?.trim();
}
