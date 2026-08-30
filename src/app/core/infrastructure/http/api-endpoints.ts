import { environment } from '../../../../environments/environment';

/**
 * Rutas de la API (ver APIDOC.json). Centralizadas para que ningún
 * repositorio de infraestructura concatene strings sueltos.
 */
export const ApiEndpoints = {
  auth: {
    login: () => `${environment.apiBaseUrl}/auth/login`,
    refresh: () => `${environment.apiBaseUrl}/auth/refresh`,
    me: () => `${environment.apiBaseUrl}/auth/me`,
  },
} as const;
