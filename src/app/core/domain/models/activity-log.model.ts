import { PageQuery } from './page-query.model';

/** Severidad de la traza (`ActivityLogResponse.level` en APIDOC.json). */
export type ActivityLogLevel = 'INFO' | 'WARNING' | 'SEVERE';

/**
 * Rol del autor de la traza. No reutiliza el enum `Role` de negocio: además
 * de los tres roles de usuario admite `SYSTEM`, marca de los registros que
 * el propio backend escribe sin usuario autenticado detrás (arranque,
 * tareas programadas), que no pertenecen a ninguna organización.
 */
export type ActivityLogRole = 'ADMIN' | 'BRANCH_MANAGER' | 'INVENTORY_OPERATOR' | 'SYSTEM';

export type ActivityLogSortField = 'occurredAt' | 'username' | 'role' | 'useCase' | 'level';

/**
 * Entrada de la traza de auditoría centralizada (`ActivityLogResponse`).
 * Solo lectura: el backend la escribe solo, no hay endpoint de creación ni
 * edición — una traza editable no serviría como evidencia.
 */
export interface ActivityLog {
  id: string;
  /** ISO-8601 en UTC. */
  occurredAt: string;
  /** Correo del autor, o `"sistema"` en registros de `SYSTEM`. */
  username: string;
  userId: string | null;
  /** `null` en registros del sistema, que no pertenecen a ninguna organización. */
  organizationId: string | null;
  role: ActivityLogRole;
  useCase: string;
  /** Descripción de la operación, máx. 1000 caracteres. */
  operation: string;
  level: ActivityLogLevel;
  /** Atajo: `true` cuando no hubo usuario autenticado detrás del registro. */
  systemGenerated: boolean;
}

/**
 * Filtros + paginación de `GET /organizations/{organizationId}/activity-logs`.
 * Todos opcionales; sin `sortBy` el backend ordena por `occurredAt` DESC
 * (lo más reciente primero), que es lo que quiere una pantalla de auditoría.
 */
export interface ActivityLogQuery extends PageQuery {
  username?: string;
  role?: ActivityLogRole;
  /** Búsqueda parcial, p. ej. "Sale", "Transfer". */
  useCase?: string;
  level?: ActivityLogLevel;
  /** Búsqueda parcial sobre `operation`. */
  text?: string;
  /** ISO-8601, límite inferior inclusive. */
  from?: string;
  /** ISO-8601, límite superior inclusive. */
  to?: string;
  /** Por defecto `false`; en `true` añade los registros de `SYSTEM`. */
  includeSystem?: boolean;
  sortBy?: ActivityLogSortField;
}
