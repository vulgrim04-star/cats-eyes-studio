import { useSettingsStore } from '../store/useSettingsStore';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' };
const CURRENCY_LOCALES = { EUR: 'fr-FR', USD: 'en-US', GBP: 'en-GB', CHF: 'fr-CH' };

export const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'Dollar US ($)' },
  { code: 'GBP', label: 'Livre sterling (£)' },
  { code: 'CHF', label: 'Franc suisse (CHF)' },
];

function currentCurrency() {
  return useSettingsStore.getState().salon.currency ?? 'EUR';
}

export function formatPrice(value) {
  const currency = currentCurrency();
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${value.toFixed(2).replace('.00', '')} ${symbol}`;
}

export function formatPriceFull(value) {
  const currency = currentCurrency();
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'fr-FR', { style: 'currency', currency }).format(value);
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

export function initials(firstName, lastName) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

export function fullName(client) {
  return `${client.firstName} ${client.lastName}`;
}
