import { Routes } from '@angular/router';

/**
 * Sin `roleGuard`: a diferencia del catálogo (Categoría, Producto, Lista de
 * precios), el inventario es operativo, no un maestro — cualquier rol
 * autenticado necesita consultar saldos y registrar movimientos dentro de
 * su propia sucursal. El alcance real (qué sucursal puede ver/mover cada
 * quien) lo impone el backend con 403, igual que en `branches.routes.ts`.
 */
export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./inventory-list/inventory-list.page').then((m) => m.InventoryListPage),
    title: 'Inventario · OptiPlant',
  },
  {
    path: 'entries',
    loadComponent: () => import('./inventory-entry/inventory-entry.page').then((m) => m.InventoryEntryPage),
    title: 'Registrar entrada · OptiPlant',
  },
  {
    path: 'exits',
    loadComponent: () => import('./inventory-exit/inventory-exit.page').then((m) => m.InventoryExitPage),
    title: 'Registrar salida · OptiPlant',
  },
  {
    path: ':productId/movements',
    loadComponent: () =>
      import('./inventory-movements/inventory-movements.page').then((m) => m.InventoryMovementsPage),
    title: 'Movimientos · OptiPlant',
  },
];
