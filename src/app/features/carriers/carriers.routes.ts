import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Role } from '../../core/domain/enums/role.enum';

/** Mismo criterio que `branches.routes.ts`: listado abierto, alta/edición ADMIN. */
export const CARRIERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./carrier-list/carrier-list.page').then((m) => m.CarrierListPage),
    title: 'Transportistas · OptiPlant',
  },
  {
    path: 'new',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./carrier-form/carrier-form.page').then((m) => m.CarrierFormPage),
    title: 'Nuevo transportista · OptiPlant',
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./carrier-form/carrier-form.page').then((m) => m.CarrierFormPage),
    title: 'Editar transportista · OptiPlant',
  },
];
