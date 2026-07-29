import { createEye } from '../utils/lashModel';

/** Fabrique un œil de démonstration.
 * @param {number[]} lengths longueurs en mm, du coin INTERNE vers le coin EXTERNE
 * @param {object} global réglages de l'œil (courbure, épaisseur, technique, densité…)
 * @param {Object<number, object>} [overrides] surcharges par index de secteur
 */
function eye(lengths, global, overrides = {}) {
  const base = createEye(lengths.length, global);
  return {
    ...base,
    zones: base.zones.map((zone, i) => ({ ...zone, length: lengths[i], ...(overrides[i] ?? {}) })),
  };
}

export const clients = [
  {
    id: 'cli_1',
    firstName: 'Camille',
    lastName: 'Dubreuil',
    phone: '06 12 34 56 78',
    email: 'camille.dubreuil@gmail.com',
    lashType: 'fin',
    curl: 'C',
    length: '10-12mm',
    allergies: 'Aucune connue',
    contraindications: '',
    consentSigned: true,
    consentDate: '2026-01-14',
    lashMapConsentSigned: true,
    lashMapConsentDate: '2026-01-14',
    notes: 'Préfère un effet naturel, très sensible aux vapeurs de colle, prévoir ventilateur.',
    createdAt: '2026-01-14',
    photos: [
      { id: 'ph_1', sessionDate: '2026-03-02', label: 'Volume russe 3D', beforeUrl: '', afterUrl: '' },
      { id: 'ph_2', sessionDate: '2026-05-20', label: 'Retouche 3 semaines', beforeUrl: '', afterUrl: '' },
    ],
    lashMaps: [
      {
        id: 'lm_1',
        date: '2026-05-20',
        eyeShape: 'Amande',
        lashHealth: 'Fins mais résistants',
        fillCycle: '3 semaines',
        setShape: 'Naturel',
        poseType: 'Retouche 3 sem',
        // Les secteurs vont TOUJOURS du coin interne au coin externe, pour les deux
        // yeux : c'est le dessin de l'œil gauche qui est retourné, pas la donnée.
        leftEye: eye(
          [8, 9, 10, 11, 11, 11, 11, 11, 10, 10, 9, 8],
          { curl: 'C', diameter: '0.05', style: 'Volume Russe', density: '3D', color: 'Noir' }
        ),
        rightEye: eye(
          [8, 9, 10, 11, 11, 11, 11, 11, 10, 10, 9, 8],
          { curl: 'C', diameter: '0.05', style: 'Volume Russe', density: '3D', color: 'Noir' }
        ),
        adhesive: 'Sensitive 1-2 s',
        poseDuration: '2 h 10',
        products: 'Bouquets pré-fannés 0.05 · plateau C',
        advice: 'Brosser matin et soir, éviter les soins gras sur la ligne de cils.',
        notes: 'Effet naturel demandé, densité légère sur les coins externes.',
      },
    ],
  },
  {
    id: 'cli_2',
    firstName: 'Manon',
    lastName: 'Lefebvre',
    phone: '06 23 45 67 89',
    email: 'manon.lefebvre@outlook.fr',
    lashType: 'normal',
    curl: 'D',
    length: '11-13mm',
    allergies: 'Latex',
    contraindications: 'Conjonctivite occasionnelle, vérifier avant chaque pose',
    consentSigned: true,
    consentDate: '2025-11-02',
    birthday: '1994-07-25',
    contactPreference: 'whatsapp',
    referralSource: 'Instagram',
    notes: 'Cliente fidèle depuis 2025. Aime beaucoup discuter voyages pendant la pose.',
    createdAt: '2025-11-02',
    photos: [
      { id: 'ph_3', sessionDate: '2026-04-11', label: 'Mega volume 8D', beforeUrl: '', afterUrl: '' },
    ],
  },
  {
    id: 'cli_3',
    firstName: 'Chloé',
    lastName: 'Girard',
    phone: '06 34 56 78 90',
    email: 'chloe.girard@yahoo.fr',
    lashType: 'épais',
    curl: 'CC',
    length: '9-11mm',
    allergies: 'Aucune connue',
    contraindications: '',
    consentSigned: false,
    consentDate: null,
    notes: 'Nouvelle cliente, premier RDV prévu. Consentement RGPD à faire signer sur place.',
    createdAt: '2026-06-30',
    photos: [],
  },
  {
    id: 'cli_4',
    firstName: 'Sarah',
    lastName: 'Benali',
    phone: '06 45 67 89 01',
    email: 'sarah.benali@gmail.com',
    lashType: 'normal',
    curl: 'D',
    length: '12-14mm',
    allergies: 'Colle à base de cyanoacrylate (réaction légère)',
    contraindications: 'Utiliser colle sensitive uniquement',
    consentSigned: true,
    consentDate: '2025-09-18',
    notes: 'A eu une réaction légère en 2025 avec la colle standard. Toujours utiliser la gamme sensitive.',
    createdAt: '2025-09-18',
    photos: [
      { id: 'ph_4', sessionDate: '2026-02-08', label: 'Classique 1D', beforeUrl: '', afterUrl: '' },
      { id: 'ph_5', sessionDate: '2026-05-03', label: 'Retouche 4 semaines', beforeUrl: '', afterUrl: '' },
    ],
  },
  {
    id: 'cli_5',
    firstName: 'Élise',
    lastName: 'Rousseau',
    phone: '06 56 78 90 12',
    email: 'elise.rousseau@gmail.com',
    lashType: 'fin',
    curl: 'M',
    length: '8-10mm',
    allergies: 'Aucune connue',
    contraindications: 'Yeux très sensibles, pauses fréquentes nécessaires',
    consentSigned: true,
    consentDate: '2026-02-27',
    notes: 'A eu 2 no-shows en 2026, demander confirmation SMS la veille systématiquement.',
    createdAt: '2026-02-27',
    photos: [],
  },
  {
    id: 'cli_6',
    firstName: 'Julia',
    lastName: 'Fontaine',
    phone: '06 67 89 01 23',
    email: 'julia.fontaine@gmail.com',
    lashType: 'épais',
    curl: 'D',
    length: '13-15mm',
    allergies: 'Aucune connue',
    contraindications: '',
    consentSigned: true,
    consentDate: '2025-06-10',
    lashMapConsentSigned: true,
    lashMapConsentDate: '2025-06-10',
    notes: "Cliente VIP, vient tous les mois pour l'entretien. Adore le mega volume.",
    createdAt: '2025-06-10',
    photos: [
      { id: 'ph_6', sessionDate: '2026-01-15', label: 'Mega volume 9D', beforeUrl: '', afterUrl: '' },
      { id: 'ph_7', sessionDate: '2026-04-22', label: 'Entretien mensuel', beforeUrl: '', afterUrl: '' },
      { id: 'ph_8', sessionDate: '2026-06-18', label: 'Entretien mensuel', beforeUrl: '', afterUrl: '' },
    ],
    lashMaps: [
      {
        id: 'lm_2',
        date: '2026-07-14',
        eyeShape: 'Cat Eye',
        lashHealth: 'Épais et courts',
        fillCycle: '2-3 semaines',
        setShape: 'Cat Eye',
        poseType: 'Pose complète',
        templateId: 'kim-k',
        // Cat Eye wispy : dégradé croissant vers l'externe, avec des spikes plus longs
        // un secteur sur deux dans le tiers externe (surcharge de densité).
        leftEye: eye(
          [8, 9, 10, 10, 11, 12, 12, 13, 13, 14, 13, 13],
          { curl: 'D', diameter: '0.03', style: 'Kim K', density: '6D', color: 'Noir' },
          { 7: { density: '2D' }, 9: { density: '2D' }, 11: { density: '2D' } }
        ),
        rightEye: eye(
          [8, 9, 10, 10, 11, 12, 12, 13, 13, 14, 13, 13],
          { curl: 'D', diameter: '0.03', style: 'Kim K', density: '6D', color: 'Noir' },
          { 7: { density: '2D' }, 9: { density: '2D' }, 11: { density: '2D' } }
        ),
        adhesive: 'Ultra bond 0.5 s',
        poseDuration: '2 h 45',
        products: 'Fibres 0.03 handmade · plateau D',
        sensitivities: 'Aucune, supporte la colle rapide',
        advice: 'Retouche à 3 semaines pour garder les spikes nets.',
        notes: 'Adore l\'effet dramatique. Coins externes très fournis, spikes wispy.',
      },
      {
        id: 'lm_3',
        date: '2026-06-18',
        eyeShape: 'Cat Eye',
        lashHealth: 'Épais et courts',
        fillCycle: '2-3 semaines',
        setShape: 'Cat Eye',
        poseType: 'Retouche 4 sem',
        templateId: 'classic-cat-eye',
        leftEye: eye(
          [8, 9, 9, 10, 11, 11, 12, 12, 13, 13, 13, 13],
          { curl: 'D', diameter: '0.03', style: 'Mega Volume', density: '6D', color: 'Noir' }
        ),
        rightEye: eye(
          [8, 9, 9, 10, 11, 11, 12, 12, 13, 13, 13, 13],
          { curl: 'D', diameter: '0.03', style: 'Mega Volume', density: '6D', color: 'Noir' }
        ),
        adhesive: 'Ultra bond 0.5 s',
        fillDuration: '1 h 30',
        notes: 'Retouche mensuelle habituelle.',
      },
      {
        id: 'lm_4',
        date: '2026-04-22',
        eyeShape: 'Amande',
        lashHealth: 'Épais et courts',
        fillCycle: '3 semaines',
        setShape: 'Doll Eye',
        poseType: 'Pose complète',
        templateId: 'doll-eye',
        leftEye: eye(
          [9, 10, 11, 12, 13, 13, 13, 13, 12, 11, 10, 9],
          { curl: 'CC', diameter: '0.05', style: 'Volume Russe', density: '4D', color: 'Noir' }
        ),
        rightEye: eye(
          [9, 10, 11, 12, 13, 13, 13, 13, 12, 11, 10, 9],
          { curl: 'CC', diameter: '0.05', style: 'Volume Russe', density: '4D', color: 'Noir' }
        ),
        adhesive: 'Sensitive 1-2 s',
        poseDuration: '2 h 20',
        notes: 'Essai Doll Eye avant l\'été : longueurs maximales au centre, coins adoucis.',
      },
    ],
  },
  {
    id: 'cli_7',
    firstName: 'Nora',
    lastName: 'Traoré',
    phone: '06 78 90 12 34',
    email: 'nora.traore@hotmail.com',
    lashType: 'normal',
    curl: 'C',
    length: '10-12mm',
    allergies: 'Aucune connue',
    contraindications: '',
    consentSigned: true,
    consentDate: '2026-04-05',
    notes: 'Se marie en septembre 2026, prévoit le pack mariée avec essai un mois avant.',
    createdAt: '2026-04-05',
    photos: [],
  },
];

export const getClientById = (id) => clients.find((c) => c.id === id);
