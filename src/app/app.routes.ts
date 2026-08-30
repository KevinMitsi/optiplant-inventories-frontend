import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
    title: 'Panel · OptiPlant',
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./shared/ui/forbidden.page').then((m) => m.ForbiddenPage),
    title: 'Sin acceso · OptiPlant',
  },
  { path: '**', redirectTo: 'dashboard' },
];
