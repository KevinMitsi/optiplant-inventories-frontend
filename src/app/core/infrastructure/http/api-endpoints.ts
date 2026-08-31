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
  categories: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/categories`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/categories`,
    byId: (categoryId: string) => `${environment.apiBaseUrl}/categories/${categoryId}`,
    activate: (categoryId: string) => `${environment.apiBaseUrl}/categories/${categoryId}/activation`,
    deactivate: (categoryId: string) =>
      `${environment.apiBaseUrl}/categories/${categoryId}/deactivation`,
  },
  carriers: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/carriers`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/carriers`,
    byId: (carrierId: string) => `${environment.apiBaseUrl}/carriers/${carrierId}`,
    activate: (carrierId: string) => `${environment.apiBaseUrl}/carriers/${carrierId}/activation`,
    deactivate: (carrierId: string) => `${environment.apiBaseUrl}/carriers/${carrierId}/deactivation`,
  },
  suppliers: {
    search: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/suppliers`,
    create: (organizationId: string) =>
      `${environment.apiBaseUrl}/organizations/${organizationId}/suppliers`,
    byId: (supplierId: string) => `${environment.apiBaseUrl}/suppliers/${supplierId}`,
    activate: (supplierId: string) => `${environment.apiBaseUrl}/suppliers/${supplierId}/activation`,
    deactivate: (supplierId: string) =>
      `${environment.apiBaseUrl}/suppliers/${supplierId}/deactivation`,
  },
  unitsOfMeasure: {
    list: () => `${environment.apiBaseUrl}/units-of-measure`,
  },
} as const;
