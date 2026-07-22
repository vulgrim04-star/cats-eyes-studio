export const SERVICE_CATEGORIES = [
  { id: 'cils', label: 'Extensions de cils' },
  { id: 'sourcils', label: 'Sourcils' },
  { id: 'soins', label: 'Soins' },
  { id: 'forfaits', label: 'Forfaits' },
];

export const services = [
  // Extensions de cils
  { id: 'srv_1', name: 'Pose complète classique (1D)', category: 'cils', duration: 90, price: 55 },
  { id: 'srv_2', name: 'Pose complète volume russe (2D à 6D)', category: 'cils', duration: 120, price: 75 },
  { id: 'srv_3', name: 'Pose complète mega volume (7D+)', category: 'cils', duration: 150, price: 95 },
  { id: 'srv_4', name: 'Retouche 2 semaines', category: 'cils', duration: 60, price: 35 },
  { id: 'srv_5', name: 'Retouche 3 semaines', category: 'cils', duration: 75, price: 42 },
  { id: 'srv_6', name: 'Retouche 4 semaines', category: 'cils', duration: 90, price: 48 },
  { id: 'srv_7', name: 'Dépose simple', category: 'cils', duration: 30, price: 15 },
  { id: 'srv_8', name: 'Dépose + repose', category: 'cils', duration: 120, price: 65 },

  // Sourcils
  { id: 'srv_9', name: 'Design sourcils', category: 'sourcils', duration: 30, price: 25 },
  { id: 'srv_10', name: 'Lamination de sourcils', category: 'sourcils', duration: 45, price: 40 },
  { id: 'srv_11', name: 'Teinture sourcils', category: 'sourcils', duration: 20, price: 18 },
  { id: 'srv_12', name: 'Henna brows', category: 'sourcils', duration: 40, price: 35 },
  { id: 'srv_13', name: 'Microblading', category: 'sourcils', duration: 120, price: 250 },
  { id: 'srv_14', name: 'Combo lamination + teinture', category: 'sourcils', duration: 60, price: 52 },

  // Soins
  { id: 'srv_15', name: 'Lifting de cils', category: 'soins', duration: 45, price: 45 },
  { id: 'srv_16', name: 'Teinture de cils', category: 'soins', duration: 20, price: 18 },
  { id: 'srv_17', name: 'Combo lifting + teinture', category: 'soins', duration: 60, price: 55 },

  // Forfaits
  { id: 'srv_18', name: 'Pack cils + sourcils', category: 'forfaits', duration: 150, price: 110 },
  { id: 'srv_19', name: 'Pack mariée', category: 'forfaits', duration: 180, price: 160 },
  { id: 'srv_20', name: 'Pack entretien mensuel', category: 'forfaits', duration: 90, price: 68 },
];

export const getServiceById = (id) => services.find((s) => s.id === id);
export const getCategoryLabel = (id) => SERVICE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
