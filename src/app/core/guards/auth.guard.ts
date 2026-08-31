import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../state/auth-store.service';

/**
 * Protege rutas que exigen sesión iniciada. `AuthStore.status` ya está
 * resuelto para cuando el router evalúa guards, porque `BootstrapSessionUseCase`
 * corre dentro de un `provideAppInitializer` que bloquea el arranque de la app
 * (ver `app.config.ts`).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
