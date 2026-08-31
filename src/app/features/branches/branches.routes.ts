import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Role } from '../../core/domain/enums/role.enum';

/**
 * El listado es visible para cualquier autenticado (HU-06: un operador
 * necesita saber qué sucursales existen antes de pedir una transferencia).
 * Crear/editar sí es exclusivo de ADMIN (RN-12): son las operaciones de
 * escritura del recurso, y el backend las rechaza igual para otros roles —
 * este guard es defensa en profundidad de UX, no la autorización real.
 */
export const BRANCHES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./branch-list/branch-list.page').then((m) => m.BranchListPage),
    title: 'Sucursales · OptiPlant',
  },
  {
    path: 'new',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./branch-form/branch-form.page').then((m) => m.BranchFormPage),
    title: 'Nueva sucursal · OptiPlant',
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./branch-form/branch-form.page').then((m) => m.BranchFormPage),
    title: 'Editar sucursal · OptiPlant',
  },
];
