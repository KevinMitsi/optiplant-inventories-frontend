import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./shared/ui/forbidden.page').then((m) => m.ForbiddenPage),
    title: 'Sin acceso · OptiPlant',
  },
  {
    // Shell autenticado: sidebar + topbar, compartidos por todas las páginas
    // protegidas. `authGuard` en el padre basta (los guards se heredan).
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/ui/layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
        title: 'Panel · OptiPlant',
      },
      {
        path: 'branches',
        loadChildren: () => import('./features/branches/branches.routes').then((m) => m.BRANCHES_ROUTES),
      },
      {
        path: 'categories',
        loadChildren: () => import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
      },
      {
        path: 'carriers',
        loadChildren: () => import('./features/carriers/carriers.routes').then((m) => m.CARRIERS_ROUTES),
      },
      {
        path: 'suppliers',
        loadChildren: () => import('./features/suppliers/suppliers.routes').then((m) => m.SUPPLIERS_ROUTES),
      },
      {
        path: 'units-of-measure',
        loadChildren: () =>
          import('./features/units-of-measure/units-of-measure.routes').then((m) => m.UNITS_OF_MEASURE_ROUTES),
      },
      {
        path: 'products',
        loadChildren: () => import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'price-lists',
        loadChildren: () => import('./features/price-lists/price-lists.routes').then((m) => m.PRICE_LISTS_ROUTES),
      },
      {
        path: 'inventory',
        loadChildren: () => import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
