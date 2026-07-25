// Guide de démarrage affiché dans l'application (/guide). Volontairement court : une
// testeuse qui découvre l'outil doit pouvoir être opérationnelle en quelques minutes.
export const GUIDE_STEPS = [
  {
    title: '1. Créez vos prestations',
    where: 'Catalogue',
    body:
      "Commencez par saisir ce que vous proposez, avec la durée et le prix. Tout le reste s'appuie dessus : l'agenda calcule les créneaux à partir de la durée, et les statistiques à partir du prix.",
  },
  {
    title: '2. Réglez vos horaires',
    where: 'Paramètres → Horaires d\'ouverture',
    body:
      "Vos jours et heures d'ouverture déterminent les créneaux proposés à vos clientes. Vous pouvez aussi définir un temps de battement entre deux rendez-vous, pour souffler ou nettoyer le poste.",
  },
  {
    title: '3. Ajoutez vos clientes',
    where: 'Clientes',
    body:
      "Fiche complète : coordonnées, allergies, contre-indications, notes. Vous pouvez aussi les créer à la volée au moment de planifier un rendez-vous.",
  },
  {
    title: '4. Planifiez un rendez-vous',
    where: 'Agenda → Nouveau RDV',
    body:
      "Choisissez la cliente, la prestation, la date : seuls les créneaux réellement libres sont proposés. Une fois la séance terminée, marquez-la comme telle pour qu'elle compte dans vos finances.",
  },
  {
    title: '5. Documentez la pose',
    where: 'Fiche cliente → Lash Map',
    body:
      "Notez la courbure, les longueurs par zone, la colle utilisée. À la prochaine séance, vous retrouvez exactement ce que vous aviez fait — et le nombre de cases est ajustable selon la précision voulue.",
  },
  {
    title: '6. Partagez votre lien de réservation',
    where: 'Paramètres → Lien de réservation en ligne',
    body:
      "Vos clientes réservent seules, vous validez. Activez les notifications dans Paramètres pour être prévenue dès qu'une demande arrive, même l'application fermée.",
  },
];

export const GUIDE_TIPS = [
  {
    title: 'Installez l\'application sur votre téléphone',
    body:
      "Depuis le navigateur : menu → « Sur l'écran d'accueil ». Elle s'ouvre alors comme une vraie application. Sur iPhone, c'est aussi indispensable pour recevoir les notifications.",
  },
  {
    title: 'Faites des sauvegardes',
    body:
      "Paramètres → Sauvegarde des données. Vos données sont synchronisées sur votre compte, mais pendant la phase de test, gardez aussi une copie sur votre appareil.",
  },
  {
    title: 'Dites-moi ce qui coince',
    body:
      "Paramètres → « Envoyer un retour ». C'est le moyen le plus rapide de faire avancer l'application : chaque remarque est lue.",
  },
];
