import { useUIStore } from '../store/useUIStore';

export function useToast() {
  const toasts = useUIStore((s) => s.toasts);
  const showToast = useUIStore((s) => s.showToast);
  const dismissToast = useUIStore((s) => s.dismissToast);
  return { toasts, showToast, dismissToast };
}
