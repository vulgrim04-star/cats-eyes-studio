export const PRODUCT_CATEGORIES = [
  { id: 'colle', label: 'Colles' },
  { id: 'cils', label: 'Extensions de cils' },
  { id: 'sourcils', label: 'Sourcils' },
  { id: 'consommables', label: 'Consommables' },
  { id: 'soins', label: 'Soins' },
];

export const products = [
  { id: 'prd_1', name: 'Colle extensions sensitive', category: 'colle', unit: 'flacon', stock: 3, stockMin: 5, costPerUnit: 18, supplier: 'LashPro France' },
  { id: 'prd_2', name: 'Colle extensions standard', category: 'colle', unit: 'flacon', stock: 8, stockMin: 4, costPerUnit: 14, supplier: 'LashPro France' },
  { id: 'prd_3', name: 'Colle lamination sourcils', category: 'colle', unit: 'flacon', stock: 2, stockMin: 3, costPerUnit: 16, supplier: 'BrowLift Pro' },
  { id: 'prd_4', name: 'Cils individuels 0.05mm C', category: 'cils', unit: 'plateau', stock: 6, stockMin: 4, costPerUnit: 9, supplier: 'LashSupply' },
  { id: 'prd_5', name: 'Cils individuels 0.07mm D', category: 'cils', unit: 'plateau', stock: 2, stockMin: 4, costPerUnit: 9, supplier: 'LashSupply' },
  { id: 'prd_6', name: 'Cils mega volume 0.03mm', category: 'cils', unit: 'plateau', stock: 5, stockMin: 3, costPerUnit: 11, supplier: 'LashSupply' },
  { id: 'prd_7', name: 'Primer nettoyant cils', category: 'cils', unit: 'flacon', stock: 4, stockMin: 3, costPerUnit: 7, supplier: 'LashPro France' },
  { id: 'prd_8', name: 'Patchs sous-yeux gel', category: 'consommables', unit: 'boîte (50 paires)', stock: 1, stockMin: 3, costPerUnit: 12, supplier: 'BeautyStock' },
  { id: 'prd_9', name: 'Micro-brosses jetables', category: 'consommables', unit: 'paquet (100)', stock: 7, stockMin: 3, costPerUnit: 5, supplier: 'BeautyStock' },
  { id: 'prd_10', name: 'Ruban adhésif micropore', category: 'consommables', unit: 'rouleau', stock: 9, stockMin: 4, costPerUnit: 3, supplier: 'BeautyStock' },
  { id: 'prd_11', name: 'Teinture sourcils noir', category: 'sourcils', unit: 'tube', stock: 2, stockMin: 3, costPerUnit: 8, supplier: 'BrowLift Pro' },
  { id: 'prd_12', name: 'Teinture sourcils brun', category: 'sourcils', unit: 'tube', stock: 6, stockMin: 3, costPerUnit: 8, supplier: 'BrowLift Pro' },
  { id: 'prd_13', name: 'Kit henna brows', category: 'sourcils', unit: 'kit', stock: 4, stockMin: 2, costPerUnit: 22, supplier: 'HennaCraft' },
  { id: 'prd_14', name: 'Kit lamination sourcils (1-2-3)', category: 'sourcils', unit: 'kit', stock: 1, stockMin: 3, costPerUnit: 28, supplier: 'BrowLift Pro' },
  { id: 'prd_15', name: 'Sérum fortifiant cils & sourcils', category: 'soins', unit: 'flacon', stock: 5, stockMin: 2, costPerUnit: 15, supplier: 'PureLash Care' },
  { id: 'prd_16', name: 'Gants nitrile taille S', category: 'consommables', unit: 'boîte (100)', stock: 3, stockMin: 2, costPerUnit: 9, supplier: 'BeautyStock' },
];

export const getProductById = (id) => products.find((p) => p.id === id);
