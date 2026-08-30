import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../domain/enums/role.enum';
import { AuthStore } from '../state/auth-store.service';

/**
 * Fábrica de guard por rol: `roleGuard([Role.Admin, Role.BranchManager])`.
 * Requiere sesión iniciada (si no la hay, actúa igual que `authGuard`) y
 * además que el rol del usuario esté entre los permitidos; si no lo está,
 * redirige a `/forbidden` en vez de a `/login` (la sesión es válida, solo
 * carece de permiso).
 *
 * Uso típico en rutas: `{ path: 'users', canActivate: [roleGuard([Role.Admin])], ... }`.
 */
export const roleGuard = (allowedRoles: readonly Role[]): CanActivateFn => {
  return (_route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (!authStore.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    const role = authStore.role();
    if (role && allowedRoles.includes(role)) {
      return true;
    }

    return router.createUrlTree(['/forbidden']);
  };
};
