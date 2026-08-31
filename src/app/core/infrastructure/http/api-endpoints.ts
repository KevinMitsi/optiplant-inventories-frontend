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
  branches: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/branches`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/branches`,
    byId: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}`,
    activate: (branchId: string) => `${environment.apiBaseUrl}/branches/${branchId}/activation`,
    deactivate: (branchId: string) =>
      `${environment.apiBaseUrl}/branches/${branchId}/deactivation`,
  },
} as const;
