import { useProductsStore } from '../store/useProductsStore';
import { useUIStore } from '../store/useUIStore';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * Couche d'accès aux données de stock. Découplée du store interne
 * pour permettre un branchement futur sur une API sans changer les appelants.
 */
export function useProducts() {
  const products = useProductsStore((s) => s.products);
  const movements = useProductsStore((s) => s.movements);
  const addProductRaw = useProductsStore((s) => s.addProduct);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const addStockRaw = useProductsStore((s) => s.addStock);
  const removeStockRaw = useProductsStore((s) => s.removeStock);
  const movementsForProduct = useProductsStore((s) => s.movementsForProduct);
  const removeProductRaw = useProductsStore((s) => s.removeProduct);
  const showToast = useUIStore((s) => s.showToast);

  const currentUser = () => useSettingsStore.getState().salon.managerName;

  const addProduct = (data) => {
    const product = addProductRaw(data);
    showToast(`« ${product.name} » ajouté au stock`, 'success');
    return product;
  };

  const addStock = (payload) => {
    addStockRaw({ user: currentUser(), ...payload });
    showToast(`Commande enregistrée : +${payload.quantity} en stock`, 'success');
  };

  const removeStock = (payload) => {
    removeStockRaw({ user: currentUser(), ...payload });
    showToast(`Mouvement enregistré : -${payload.quantity} en stock`, 'success');
  };

  const removeProduct = (productId) => {
    removeProductRaw(productId);
    showToast('Produit supprimé du stock', 'warning');
  };

  return { products, movements, addProduct, updateProduct, addStock, removeStock, movementsForProduct, removeProduct };
}

export function lowStockProducts(products) {
  return products.filter((p) => p.stock < p.stockMin);
}

export function stockRatio(product) {
  if (product.stockMin === 0) return 1;
  return Math.min(1, product.stock / (product.stockMin * 2));
}
