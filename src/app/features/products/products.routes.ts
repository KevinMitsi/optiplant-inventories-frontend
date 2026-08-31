import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Role } from '../../core/domain/enums/role.enum';

/**
 * Mismo criterio que `categories.routes.ts`: el listado es visible para
 * cualquier autenticado (hace falta para operar inventario); alta/edición
 * (incluida la gestión de presentaciones) quedan reservadas a ADMIN, por ser
 * maestro de catálogo.
 */
export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./product-list/product-list.page').then((m) => m.ProductListPage),
    title: 'Productos · OptiPlant',
  },
  {
    path: 'new',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./product-form/product-form.page').then((m) => m.ProductFormPage),
    title: 'Nuevo producto · OptiPlant',
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./product-form/product-form.page').then((m) => m.ProductFormPage),
    title: 'Editar producto · OptiPlant',
  },
];
