import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Role } from '../../core/domain/enums/role.enum';

/** Mismo criterio que `branches.routes.ts`: listado abierto, alta/edición ADMIN. */
export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./supplier-list/supplier-list.page').then((m) => m.SupplierListPage),
    title: 'Proveedores · OptiPlant',
  },
  {
    path: 'new',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./supplier-form/supplier-form.page').then((m) => m.SupplierFormPage),
    title: 'Nuevo proveedor · OptiPlant',
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./supplier-form/supplier-form.page').then((m) => m.SupplierFormPage),
    title: 'Editar proveedor · OptiPlant',
  },
];
