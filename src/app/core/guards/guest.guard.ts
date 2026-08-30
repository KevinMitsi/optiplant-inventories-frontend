import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../state/auth-store.service';

/**
 * Protege rutas solo para usuarios sin sesión (p. ej. `/login`): si ya hay
 * una sesión activa, redirige directamente al dashboard en vez de mostrar el
 * formulario de nuevo.
 */
export const guestGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
