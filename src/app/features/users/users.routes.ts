import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Role } from '../../core/domain/enums/role.enum';

/**
 * El listado es visible para ADMIN y BRANCH_MANAGER — necesitan saber quién
 * opera en su ámbito (APIDOC.json: el operador de inventario no tiene
 * motivo para consultar el directorio de cuentas). Alta/edición/reasignación
 * quedan reservadas a ADMIN (`createUser`: "Solo el administrador general
 * puede crear usuarios"; reasignar y dar de baja son igual de sensibles).
 */
export const USERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard([Role.Admin, Role.BranchManager])],
    loadComponent: () => import('./user-list/user-list.page').then((m) => m.UserListPage),
    title: 'Usuarios · OptiPlant',
  },
  {
    path: 'new',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./user-form/user-form.page').then((m) => m.UserFormPage),
    title: 'Nuevo usuario · OptiPlant',
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./user-form/user-form.page').then((m) => m.UserFormPage),
    title: 'Editar usuario · OptiPlant',
  },
];
