import { Routes } from '@angular/router';

/** Sin `roleGuard`, igual que `purchase-orders.routes.ts`: transferir stock es trabajo operativo dentro de la propia sucursal. */
export const TRANSFERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./transfer-list/transfer-list.page').then((m) => m.TransferListPage),
    title: 'Transferencias · OptiPlant',
  },
  {
    path: 'new',
    loadComponent: () => import('./transfer-create/transfer-create.page').then((m) => m.TransferCreatePage),
    title: 'Nueva transferencia · OptiPlant',
  },
  {
    path: ':id',
    loadComponent: () => import('./transfer-detail/transfer-detail.page').then((m) => m.TransferDetailPage),
    title: 'Transferencia · OptiPlant',
  },
];
