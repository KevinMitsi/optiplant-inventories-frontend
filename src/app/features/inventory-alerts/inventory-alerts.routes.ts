import { Routes } from '@angular/router';

/** Sin `roleGuard`: cualquier rol necesita ver y cerrar alertas de su propia sucursal (backend impone el alcance). */
export const INVENTORY_ALERTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./inventory-alert-list/inventory-alert-list.page').then((m) => m.InventoryAlertListPage),
    title: 'Alertas de inventario · OptiPlant',
  },
];
