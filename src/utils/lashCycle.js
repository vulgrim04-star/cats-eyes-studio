import { addDaysISO } from './date';

// Extrait un nombre de jours approximatif d'un texte libre de type "2-3 semaines",
// "10 jours" ou "1 mois" — best-effort, retourne null si le texte n'est pas reconnu
// plutôt que de risquer une estimation absurde.
export function parseCycleDays(text) {
  if (!text) return null;
  const match = /(\d+)\s*(?:-|à)?\s*(\d+)?\s*(jour|semaine|mois)/i.exec(text);
  if (!match) return null;
  const n1 = parseInt(match[1], 10);
  const n2 = match[2] ? parseInt(match[2], 10) : n1;
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
