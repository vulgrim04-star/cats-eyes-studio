// Heuristique de coût de revient : faute d'une nomenclature détaillée par prestation,
// on estime la consommation de matières comme un pourcentage du prix, variable par catégorie.
const COST_RATIO = {
  cils: 0.2,
  sourcils: 0.16,
  soins: 0.14,
  forfaits: 0.18,
};

export function estimateCost(service) {
  const ratio = COST_RATIO[service.category] ?? 0.18;
  return Math.round(service.price * ratio * 100) / 100;
}

export function estimateMargin(service) {
  const cost = estimateCost(service);
  const margin = service.price - cost;
  const marginPercent = service.price === 0 ? 0 : Math.round((margin / service.price) * 100);
  return { cost, margin, marginPercent };
}
