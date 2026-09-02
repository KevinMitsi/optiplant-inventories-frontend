import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Role } from '../../core/domain/enums/role.enum';

/**
 * Traza de auditoría centralizada, solo lectura. El backend la restringe a
 * ADMIN (403 para BRANCH_MANAGER/INVENTORY_OPERATOR), así que el guard
 * espeja esa regla en vez de dejar que el usuario navegue hasta un 403.
 */
export const ACTIVITY_LOGS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard([Role.Admin])],
    loadComponent: () => import('./activity-log-list/activity-log-list.page').then((m) => m.ActivityLogListPage),
    title: 'Auditoría · OptiPlant',
  },
];
