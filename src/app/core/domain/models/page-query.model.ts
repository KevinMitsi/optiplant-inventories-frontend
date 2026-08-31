/** Dirección de ordenación soportada por todos los listados paginados del backend. */
export type SortDirection = 'ASC' | 'DESC';

/**
 * Parámetros de paginación y ordenación comunes a cualquier endpoint de
 * listado (`PageResponse` en APIDOC.json). Cada feature extiende esto con
 * sus propios filtros (p. ej. `BranchQuery` añade `text`/`city`/`active`).
 */
export interface PageQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
}
