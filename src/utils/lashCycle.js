import { addDaysISO } from './date';

// Extrait un nombre de jours approximatif d'un texte libre de type "2-3 semaines",
// "10 jours" ou "1 mois" — best-effort, retourne null si le texte n'est pas reconnu
// plutôt que de risquer une estimation absurde.
// Les décimales sont acceptées, et il faut qu'elles le soient : sur « 1,5 mois », un motif
// limité aux entiers échouait sur le « 1 » puis repartait sur le « 5 » et concluait 5 mois,
// soit 150 jours de retouche au lieu de 45. Une date fausse est pire que pas de date.
const NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const CYCLE_RE = new RegExp(`(${NUMBER})\\s*(?:-|–|à)?\\s*(${NUMBER})?\\s*(jour|semaine|mois)`, 'i');

function toNumber(raw) {
  return parseFloat(raw.replace(',', '.'));
}

export function parseCycleDays(text) {
  if (!text) return null;
  const match = CYCLE_RE.exec(text);
  if (!match) return null;
  const n1 = toNumber(match[1]);
  const n2 = match[2] ? toNumber(match[2]) : n1;
  const avg = (n1 + n2) / 2;
  const unit = match[3].toLowerCase();
  const daysPerUnit = unit.startsWith('jour') ? 1 : unit.startsWith('semaine') ? 7 : 30;
  return Math.round(avg * daysPerUnit);
}

// Date de retouche suggérée = date de la séance + cycle indiqué. Retourne null si le
// cycle n'est pas renseigné ou pas reconnu (aucune suggestion plutôt qu'une fausse date).
export function estimateNextRetouchDate(sessionDateISO, fillCycleText) {
  const days = parseCycleDays(fillCycleText);
  if (!days || !sessionDateISO) return null;
  return addDaysISO(sessionDateISO, days);
}
