import { Routes } from '@angular/router';

/** Sin `roleGuard`, igual que `sales.routes.ts`: comprar es trabajo operativo dentro de la propia sucursal. */
export const PURCHASE_ORDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./purchase-order-list/purchase-order-list.page').then((m) => m.PurchaseOrderListPage),
    title: 'Órdenes de compra · OptiPlant',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./purchase-order-create/purchase-order-create.page').then((m) => m.PurchaseOrderCreatePage),
    title: 'Nueva orden de compra · OptiPlant',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./purchase-order-detail/purchase-order-detail.page').then((m) => m.PurchaseOrderDetailPage),
    title: 'Orden de compra · OptiPlant',
  },
];
