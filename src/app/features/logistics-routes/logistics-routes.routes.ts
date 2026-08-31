import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Role } from '../../core/domain/enums/role.enum';

/** Mismo criterio que `carriers.routes.ts`: listado abierto, alta/edición ADMIN. */
export const LOGISTICS_ROUTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./logistics-route-list/logistics-route-list.page').then((m) => m.LogisticsRouteListPage),
    title: 'Rutas logísticas · OptiPlant',
  },
  {
    path: 'new',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () =>
      import('./logistics-route-form/logistics-route-form.page').then((m) => m.LogisticsRouteFormPage),
    title: 'Nueva ruta logística · OptiPlant',
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () =>
      import('./logistics-route-form/logistics-route-form.page').then((m) => m.LogisticsRouteFormPage),
    title: 'Editar ruta logística · OptiPlant',
  },
];
