import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { TokenStorageService } from '../storage/token-storage.service';
import { ApiEndpoints } from './api-endpoints';

/** Peticiones que nunca deben llevar `Authorization`: aún no hay sesión, o la crean/renuevan. */
const isAnonymousAuthRequest = (url: string): boolean =>
  url === ApiEndpoints.auth.login() || url === ApiEndpoints.auth.refresh();

const isApiRequest = (url: string): boolean => url.startsWith(environment.apiBaseUrl);

/**
 * Adjunta `Authorization: Bearer <accessToken>` a toda petición dirigida a la
 * API, salvo login/refresh. El token se lee de la cookie en cada petición
 * (nunca se cachea en el interceptor) para reflejar siempre la última
 * renovación hecha por `refresh.interceptor.ts`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);

  if (!isApiRequest(req.url) || isAnonymousAuthRequest(req.url)) {
    return next(req);
  }

  const accessToken = tokenStorage.getAccessToken();
  if (!accessToken) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    }),
  );
};
