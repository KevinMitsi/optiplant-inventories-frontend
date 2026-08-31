import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LogoutUseCase } from '../../application/auth/logout.usecase';
import { TokenStorageService } from '../storage/token-storage.service';
import { ApiEndpoints } from './api-endpoints';
import { RefreshCoordinatorService } from './refresh-coordinator.service';

const isApiRequest = (url: string): boolean => url.startsWith(environment.apiBaseUrl);
const isAuthEndpoint = (url: string): boolean =>
  url === ApiEndpoints.auth.login() || url === ApiEndpoints.auth.refresh();

/**
 * Ante un 401 de la API (que no sea el propio login/refresh), intenta renovar
 * la sesión una vez y reintenta la petición original con el nuevo access
 * token. Si la renovación también falla (refresh token caducado o cuenta
 * deshabilitada), cierra la sesión local y redirige a `/login`.
 *
 * Debe registrarse en `app.config.ts` **después** de `authInterceptor`, para
 * que la petición reintentada ya lleve la cabecera `Authorization` correcta
 * (se adjunta aquí mismo, sin volver a pasar por la cadena de interceptores).
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const refreshCoordinator = inject(RefreshCoordinatorService);
  const logout = inject(LogoutUseCase);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      if (!isUnauthorized || !isApiRequest(req.url) || isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      return refreshCoordinator.refresh().pipe(
        switchMap(() => {
          const newAccessToken = tokenStorage.getAccessToken();
          return next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${newAccessToken}` },
            }),
          );
        }),
        catchError((refreshError: unknown) => {
          logout.execute();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
