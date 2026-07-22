export const staff = [
  {
    id: 'staff_1',
    name: 'Léa Moreau',
    role: 'Gérante · Esthéticienne senior',
    color: '#C8718A',
    initials: 'LM',
    specialties: ['Volume russe', 'Mega volume', 'Design sourcils'],
  },
  {
    id: 'staff_2',
    name: 'Inès Cardoso',
    role: 'Esthéticienne',
    color: '#8B4E63',
    initials: 'IC',
    specialties: ['Classique', 'Lamination', 'Henna brows'],
  },
  {
    id: 'staff_3',
    name: 'Camille Faure',
    role: 'Esthéticienne junior',
    color: '#D9A441',
    initials: 'CF',
    specialties: ['Classique', 'Teinture', 'Lifting de cils'],
  },
];

export const getStaffById = (id) => staff.find((s) => s.id === id);
