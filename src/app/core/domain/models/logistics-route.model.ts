import { PageQuery } from './page-query.model';

/** Ruta logística entre dos sucursales (`LogisticsRouteResponse` en APIDOC.json). */
export interface LogisticsRoute {
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

/** Filtros + paginación de `GET /organizations/{organizationId}/logistics-routes`. */
export interface LogisticsRouteQuery extends PageQuery {
  originBranchId?: string;
  destinationBranchId?: string;
  active?: boolean;
}

/** Datos de alta de una ruta logística (`CreateLogisticsRouteRequest`). */
export interface CreateLogisticsRouteInput {
  originBranchId: string;
  destinationBranchId: string;
  name?: string;
  estimatedDurationMinutes: number;
  estimatedCost?: number;
  priority?: number;
}

/** Datos editables de una ruta logística (`UpdateLogisticsRouteRequest`): sin origen/destino. */
export interface UpdateLogisticsRouteInput {
  name?: string;
  estimatedDurationMinutes: number;
  estimatedCost?: number;
  priority?: number;
}
