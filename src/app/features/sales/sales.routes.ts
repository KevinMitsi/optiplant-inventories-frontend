import { Routes } from '@angular/router';

/** Sin `roleGuard`, igual que `inventory.routes.ts`: vender es trabajo operativo dentro de la propia sucursal. */
export const SALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./sale-list/sale-list.page').then((m) => m.SaleListPage),
    title: 'Ventas · OptiPlant',
  },
  {
    path: 'new',
    loadComponent: () => import('./sale-create/sale-create.page').then((m) => m.SaleCreatePage),
    title: 'Nueva venta · OptiPlant',
  },
  {
    path: ':id',
    loadComponent: () => import('./sale-detail/sale-detail.page').then((m) => m.SaleDetailPage),
    title: 'Venta · OptiPlant',
  },
];
