import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Role } from '../../core/domain/enums/role.enum';

/**
 * Mismo criterio que `branches.routes.ts`: el listado es visible para
 * cualquier autenticado (hace falta para elegir categoría al crear/editar un
 * producto); alta/edición quedan reservadas a ADMIN (RN-12).
 */
export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./category-list/category-list.page').then((m) => m.CategoryListPage),
    title: 'Categorías · OptiPlant',
  },
  {
    path: 'new',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./category-form/category-form.page').then((m) => m.CategoryFormPage),
    title: 'Nueva categoría · OptiPlant',
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./category-form/category-form.page').then((m) => m.CategoryFormPage),
    title: 'Editar categoría · OptiPlant',
  },
];
