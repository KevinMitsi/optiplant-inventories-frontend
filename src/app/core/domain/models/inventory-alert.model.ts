/**
 * Aviso automático de stock bajo/agotado (`InventoryAlertResponse` en
 * APIDOC.json, HU-16, RF-16). La dispara el propio sistema al registrar un
 * movimiento que deja el saldo en o por debajo del mínimo; se cierra sola al
 * recuperarse el stock o manualmente vía descarte/resolución.
 */
export interface InventoryAlert {
  id: string;
  inventoryId: string;
  branchId: string;
  productId: string;
  alertType: string;
  status: string;
  triggeredQuantity: number;
  minimumStock: number;
  message: string;
  createdAt: string;
  /** Nula mientras la alerta sigue abierta. */
  resolvedAt: string | null;
}

/**
 * Filtros + paginación de `GET /inventory-alerts`. Sin `branchId`, un ADMIN
 * ve las de toda la organización (RN-12). A diferencia de Inventario, la API
 * no documenta `sortBy` para este recurso, así que no se extiende `PageQuery`.
 */
export interface InventoryAlertQuery {
  branchId?: string;
  /** Por defecto el backend solo devuelve las abiertas (`OPEN`). */
  status?: string;
  page?: number;
  size?: number;
}
