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

/**
 * `priority` viaja al backend como número (0-3), pero el usuario no debería
 * teclear ese número: elige un nivel con nombre. Única fuente de verdad para
 * el mapeo — la usan tanto el formulario (select) como el listado (badge).
 */
export const LOGISTICS_ROUTE_PRIORITIES: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: 'Baja' },
  { value: 1, label: 'Media' },
  { value: 2, label: 'Alta' },
  { value: 3, label: 'Extrema' },
];

export function logisticsRoutePriorityLabel(priority: number): string {
  return LOGISTICS_ROUTE_PRIORITIES.find((option) => option.value === priority)?.label ?? String(priority);
}
