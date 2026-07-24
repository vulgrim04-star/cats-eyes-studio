// Textes des formulaires de consentement, partagés entre l'affichage à l'écran
// (ConsentModal, HealthConsentModal) et la génération PDF (utils/consentPdf.js),
// pour que le PDF signé corresponde toujours exactement à ce que la cliente a lu.

export const GDPR_INTRO =
  "Cats Eyes Studio collecte et conserve les données personnelles et de santé nécessaires à la réalisation des prestations (allergies, contre-indications, historique de pose, photos avant/après).";

export const GDPR_CLAUSES = [
  'Les données sont utilisées uniquement pour le suivi de votre dossier client.',
  'Vos photos ne sont jamais publiées sans votre accord explicite.',
  "Vous pouvez demander l'accès, la rectification ou la suppression de vos données à tout moment.",
  'Les données sont conservées 3 ans après votre dernière visite.',
  'Ce traitement est conforme au Règlement Général sur la Protection des Données (RGPD, UE) et à la Loi fédérale sur la protection des données (LPD, Suisse).',
];

export const GDPR_AGREEMENT_LABEL =
  "Je reconnais avoir pris connaissance des clauses ci-dessus et j'accepte le traitement de mes données personnelles.";

export const HEALTH_FORM_TITLE = 'Fiche de santé & consentement';

export const HEALTH_FORM_INTRO =
  "Avant chaque prestation, merci de répondre honnêtement aux questions suivantes. Ces informations permettent d'assurer votre sécurité et d'adapter la prestation si nécessaire.";

export const HEALTH_FORM_CONDITIONS = [
  { key: 'allergyCosmetics', label: 'Allergie connue aux cosmétiques ou produits chimiques' },
  { key: 'sensitiveSkin', label: 'Peau sensible ou réactive autour des yeux/sourcils' },
  { key: 'pregnancy', label: 'Grossesse ou allaitement' },
  { key: 'dermatologicalTreatment', label: 'Traitement dermatologique en cours (acide, cortisone, rétinoïdes, etc.)' },
  { key: 'autoimmuneDiabetes', label: 'Maladies auto-immunes ou diabète non stabilisé' },
  { key: 'recentAestheticProcedure', label: 'Intervention esthétique récente (microblading, extensions, etc.)' },
];

export const HEALTH_FORM_WARNING =
  "Si vous avez coché « Oui » à l'une de ces cases, merci d'en discuter avec la praticienne AVANT la prestation.";

export const HEALTH_FORM_PATCH_TEST = [
  "J'ai effectué un test de tolérance cutanée au moins 24h avant la prestation.",
  "Je comprends qu'en l'absence de ce test, la responsabilité de la praticienne ne pourra être engagée en cas de réaction allergique.",
];

export const HEALTH_FORM_POST_CARE_INTRO = 'Je reconnais avoir été informée des soins post-prestation suivants :';

export const HEALTH_FORM_POST_CARE = [
  'Ne pas mouiller la zone traitée pendant 24 à 48h.',
  'Éviter maquillage, sauna, hammam, produits gras, crèmes ou frottements.',
  'Brosser les cils/sourcils chaque matin avec un goupillon propre.',
  'Appliquer un sérum nourrissant 2 à 3 fois par semaine.',
];

export const HEALTH_FORM_IMAGE_RIGHTS_LABEL =
  "Photos avant/après à des fins de communication (site, réseaux sociaux, portfolio)";

export const HEALTH_FORM_ACKNOWLEDGEMENTS = [
  'Les informations fournies sont exactes et complètes.',
  "J'ai compris la nature de la prestation et les risques associés.",
  "Je dégage la praticienne de toute responsabilité en cas de réaction imprévisible si les consignes n'ont pas été respectées.",
];

export const HEALTH_FORM_NOTE =
  "Merci de signaler à la praticienne toute information utile même si elle ne figure pas dans ce formulaire (prestation similaire récente, traitement esthétique en institut, sensibilité particulière…).";
