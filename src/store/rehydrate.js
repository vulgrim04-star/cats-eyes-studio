import { useClientsStore } from './useClientsStore';
import { useAppointmentsStore } from './useAppointmentsStore';
import { useProductsStore } from './useProductsStore';
import { useServicesStore } from './useServicesStore';
import { useSettingsStore } from './useSettingsStore';
import { useExpensesStore } from './useExpensesStore';
import { useWaitlistStore } from './useWaitlistStore';

const PERSISTED_STORES = [
  useClientsStore,
  useAppointmentsStore,
  useProductsStore,
  useServicesStore,
  useSettingsStore,
  useExpensesStore,
  useWaitlistStore,
];

export async function rehydrateAllStores() {
  await Promise.all(PERSISTED_STORES.map((store) => store.persist.rehydrate()));
}
