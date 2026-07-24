// Textes juridiques de l'application elle-même (destinés aux professionnelles qui
// l'utilisent), à ne pas confondre avec src/data/consentText.js qui contient les
// formulaires que LEURS clientes signent en cabine.
//
// ⚠️ Les valeurs ci-dessous doivent être complétées avec les informations légales réelles
// de l'éditeur avant toute ouverture publique — les [CROCHETS] sont des marqueurs à remplacer.
export const PUBLISHER = {
  name: '[Raison sociale ou nom complet de l\'éditeur]',
  address: '[Adresse postale complète]',
  email: '[adresse e-mail de contact]',
  country: 'Suisse',
};

export const LAST_UPDATED = '25 juillet 2026';

export const APP_NAME = "Cat's Eyes Studio";

// Prestataires techniques qui traitent des données pour le compte de l'application.
export const SUBPROCESSORS = [
  { name: 'Supabase', role: 'Hébergement de la base de données et authentification', location: 'Union européenne' },
  { name: 'Vercel', role: 'Hébergement de l\'application et des fonctions serveur', location: 'Union européenne / États-Unis' },
  { name: 'Resend', role: 'Envoi des e-mails transactionnels (confirmations, notifications)', location: 'Union européenne / États-Unis' },
];

export const PRIVACY_SECTIONS = [
  {
    title: 'En résumé',
    paragraphs: [
      `${APP_NAME} est un outil de gestion destiné aux professionnelles de l'extension de cils et des sourcils. Vous y enregistrez vos rendez-vous, vos clientes et votre activité.`,
      "Deux catégories de données coexistent : celles qui vous concernent (votre compte, votre institut) et celles qui concernent vos clientes (coordonnées, fiches de santé, photos). Pour les premières, nous sommes responsables du traitement. Pour les secondes, c'est vous : nous agissons uniquement comme sous-traitant, sur vos instructions.",
    ],
  },
  {
    title: 'Responsable du traitement',
    paragraphs: [
      `${PUBLISHER.name}, ${PUBLISHER.address}, ${PUBLISHER.country}. Contact : ${PUBLISHER.email}.`,
    ],
  },
  {
    title: 'Données que nous traitons vous concernant',
    bullets: [
      "Votre adresse e-mail et votre mot de passe (stocké sous forme chiffrée, jamais en clair).",
      "Les informations de votre institut : nom, adresse, téléphone, e-mail de contact, logo, horaires, devise, taux de TVA.",
      "Vos préférences d'utilisation : thème, couleur, réglages de notifications.",
      "Les abonnements aux notifications de vos appareils, si vous les activez.",
    ],
  },
  {
    title: 'Données de vos clientes',
    paragraphs: [
      "Vous saisissez dans l'application des données concernant vos clientes : identité, coordonnées, historique de rendez-vous, notes, photos avant/après, fiches techniques (Lash Maps), ainsi que des données de santé (allergies, contre-indications, formulaires de santé signés).",
      "Les données de santé sont des données sensibles au sens de la Loi fédérale sur la protection des données (LPD) et du Règlement général sur la protection des données (RGPD). Vous êtes responsable de recueillir le consentement de vos clientes et de respecter vos obligations légales à leur égard. L'application met à votre disposition des formulaires de consentement pour vous y aider, mais leur usage relève de votre responsabilité.",
      "Nous n'accédons jamais à ces données pour notre propre compte, ne les revendons pas et ne les utilisons à aucune fin commerciale, publicitaire ou d'entraînement de modèles.",
    ],
  },
  {
    title: 'Pourquoi ces données sont traitées',
    bullets: [
      "Fournir le service : afficher votre agenda, vos fiches clientes et vos statistiques.",
      "Vous authentifier et sécuriser votre compte.",
      "Envoyer les e-mails et notifications que vous avez explicitement activés.",
      "Assurer le fonctionnement technique et corriger les dysfonctionnements.",
    ],
    paragraphs: [
      "La base légale est l'exécution du contrat qui nous lie (fourniture du service) et, pour les notifications facultatives, votre consentement — révocable à tout moment dans les Paramètres.",
    ],
  },
  {
    title: 'Hébergement et sous-traitants',
    paragraphs: [
      "L'application fait appel aux prestataires suivants, qui peuvent techniquement traiter des données pour son fonctionnement :",
    ],
    subprocessors: true,
    afterParagraphs: [
      "Certains de ces prestataires peuvent opérer des serveurs hors de Suisse et de l'Union européenne. Ces transferts sont encadrés par les garanties contractuelles proposées par ces prestataires (clauses contractuelles types).",
    ],
  },
  {
    title: 'Durée de conservation',
    paragraphs: [
      "Vos données sont conservées tant que votre compte existe. Lorsque vous supprimez votre compte depuis les Paramètres, votre compte de connexion et l'intégralité de vos données sont effacés définitivement, sans délai de rétention et sans possibilité de restauration.",
      "Il vous appartient d'exporter vos données avant suppression si vous souhaitez les conserver : la fonction de sauvegarde est disponible dans les Paramètres.",
    ],
  },
  {
    title: 'Sécurité',
    bullets: [
      "Les échanges avec l'application sont chiffrés (HTTPS).",
      "Chaque compte est techniquement isolé : les règles de sécurité de la base de données empêchent un compte d'accéder aux données d'un autre.",
      "Les mots de passe ne sont jamais stockés en clair.",
      "Les clés d'administration ne sont jamais exposées au navigateur.",
    ],
    paragraphs: [
      "Aucun système n'est infaillible. Nous vous recommandons d'utiliser un mot de passe unique et robuste, et d'effectuer des sauvegardes régulières depuis les Paramètres.",
    ],
  },
  {
    title: 'Vos droits',
    paragraphs: [
      "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et de portabilité de vos données, ainsi que du droit de vous opposer à certains traitements.",
      "L'accès, la rectification et la portabilité sont accessibles directement dans l'application (modification de vos informations, export de vos données). L'effacement est accessible via la suppression de compte dans les Paramètres.",
      `Pour toute autre demande, écrivez à ${PUBLISHER.email}. Vous pouvez également adresser une réclamation à l'autorité de protection des données compétente (en Suisse : le Préposé fédéral à la protection des données et à la transparence).`,
    ],
  },
  {
    title: 'Cookies et traceurs',
    paragraphs: [
      "L'application n'utilise ni cookie publicitaire, ni traceur d'analyse comportementale. Le stockage local du navigateur est utilisé uniquement pour maintenir votre session ouverte et conserver vos données hors ligne.",
    ],
  },
  {
    title: 'Modifications',
    paragraphs: [
      "Cette politique peut évoluer. En cas de modification substantielle, vous en serez informée par e-mail ou lors de votre prochaine connexion.",
    ],
  },
];

export const TERMS_SECTIONS = [
  {
    title: 'Objet',
    paragraphs: [
      `Les présentes conditions régissent l'utilisation de ${APP_NAME}, outil de gestion destiné aux professionnelles de l'extension de cils et des sourcils. Créer un compte vaut acceptation de ces conditions.`,
    ],
  },
  {
    title: 'Version d\'évaluation',
    highlight: true,
    paragraphs: [
      "L'application est actuellement proposée à titre gratuit, en version d'évaluation, à des fins de test et de recueil de retours d'expérience.",
      "En conséquence : le service peut être interrompu, modifié ou arrêté sans préavis ; des dysfonctionnements sont possibles ; aucune garantie de disponibilité, de performance ou d'absence de perte de données n'est donnée.",
      "Il est vivement recommandé de ne pas utiliser cette version comme unique support de vos données professionnelles, et d'effectuer des sauvegardes régulières depuis les Paramètres.",
    ],
  },
  {
    title: 'Votre compte',
    bullets: [
      "Vous devez être un·e professionnel·le majeur·e pour créer un compte.",
      "Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis votre compte.",
      "Vous vous engagez à fournir des informations exactes lors de la création de votre compte.",
    ],
  },
  {
    title: 'Vos responsabilités concernant vos clientes',
    highlight: true,
    paragraphs: [
      "Vous restez seul·e responsable des données que vous saisissez concernant vos clientes, et notamment des données de santé.",
      "Il vous appartient d'informer vos clientes du traitement de leurs données, de recueillir leur consentement lorsque la loi l'exige, de répondre à leurs demandes d'accès ou de suppression, et de respecter la réglementation applicable à votre activité.",
      "L'application fournit des formulaires de consentement types à titre d'aide. Ils ne constituent pas un conseil juridique et leur adéquation à votre situation relève de votre appréciation.",
    ],
  },
  {
    title: 'Usage acceptable',
    bullets: [
      "Ne pas utiliser le service à des fins illicites.",
      "Ne pas tenter d'accéder aux données d'un autre compte, ni de contourner les mesures de sécurité.",
      "Ne pas perturber le fonctionnement du service (surcharge volontaire, extraction automatisée massive).",
      "Ne pas téléverser de contenu illicite ou pour lequel vous ne disposez pas des droits nécessaires.",
    ],
  },
  {
    title: 'Disponibilité et évolutions',
    paragraphs: [
      "Le service est fourni « en l'état ». Des interruptions peuvent survenir pour maintenance, mise à jour ou raison technique indépendante de notre volonté. Les fonctionnalités peuvent évoluer, être modifiées ou supprimées.",
    ],
  },
  {
    title: 'Responsabilité',
    paragraphs: [
      "Dans les limites permises par la loi, la responsabilité de l'éditeur ne saurait être engagée pour les dommages indirects résultant de l'utilisation ou de l'impossibilité d'utiliser le service, notamment la perte de données, de chiffre d'affaires ou de clientèle.",
      "Ces limitations ne s'appliquent pas en cas de faute intentionnelle ou de négligence grave, ni aux droits impératifs dont vous bénéficiez en tant que consommateur.",
    ],
  },
  {
    title: 'Résiliation',
    paragraphs: [
      "Vous pouvez cesser d'utiliser le service et supprimer votre compte à tout moment depuis les Paramètres. La suppression est définitive et entraîne l'effacement de toutes vos données.",
      "L'éditeur peut suspendre ou fermer un compte en cas de manquement grave aux présentes conditions, après en avoir informé la personne concernée lorsque cela est raisonnablement possible.",
    ],
  },
  {
    title: 'Propriété intellectuelle',
    paragraphs: [
      "L'application, son code, son design et sa marque restent la propriété de l'éditeur. Les données que vous saisissez restent les vôtres : aucune cession de droits n'est opérée à notre profit.",
    ],
  },
  {
    title: 'Droit applicable',
    paragraphs: [
      `Les présentes conditions sont soumises au droit suisse. Tout litige relève des tribunaux compétents du siège de l'éditeur, sous réserve des règles impératives protégeant les consommateurs.`,
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      `Pour toute question relative à ces conditions : ${PUBLISHER.email}.`,
    ],
  },
];
