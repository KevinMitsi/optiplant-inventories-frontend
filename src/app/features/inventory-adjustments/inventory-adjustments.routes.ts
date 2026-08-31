import { Routes } from '@angular/router';

/**
 * Sin `roleGuard`, igual que `inventory.routes.ts`: crear un ajuste es
 * trabajo operativo dentro de la propia sucursal. Aprobarlo (RN-14) también
 * queda sin restricción de rol en la UI porque APIDOC.json no documenta una
 * — el backend es quien decide si createdBy/approvedBy pueden coincidir.
 */
export const INVENTORY_ADJUSTMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./inventory-adjustment-lookup/inventory-adjustment-lookup.page').then(
        (m) => m.InventoryAdjustmentLookupPage,
      ),
    title: 'Ajustes de inventario · OptiPlant',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./inventory-adjustment-create/inventory-adjustment-create.page').then(
        (m) => m.InventoryAdjustmentCreatePage,
      ),
    title: 'Nuevo ajuste de inventario · OptiPlant',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./inventory-adjustment-detail/inventory-adjustment-detail.page').then(
        (m) => m.InventoryAdjustmentDetailPage,
      ),
    title: 'Ajuste de inventario · OptiPlant',
  },
];
