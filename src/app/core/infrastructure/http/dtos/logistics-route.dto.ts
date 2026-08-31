/** Formas de red exactas de `APIDOC.json` para rutas logísticas. Aisladas
 * aquí; el resto de la app trabaja con `core/domain/models/logistics-route.model.ts`. */

export interface LogisticsRouteResponseDto {
  id: string;
  organizationId: string;
  originBranchId: string;
  destinationBranchId: string;
  name: string;
  estimatedDurationMinutes: number;
  estimatedCost: number;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLogisticsRouteRequestDto {
  originBranchId: string;
  destinationBranchId: string;
  name?: string;
  estimatedDurationMinutes: number;
  estimatedCost?: number;
  priority?: number;
}

export interface UpdateLogisticsRouteRequestDto {
  name?: string;
  estimatedDurationMinutes: number;
  estimatedCost?: number;
  priority?: number;
}
