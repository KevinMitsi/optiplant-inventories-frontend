import { PageQuery } from './page-query.model';

/** Saldo de un producto en una sucursal (`InventoryResponse` en APIDOC.json). */
export interface Inventory {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  minimumStock: number;
  averageCost: number;
  lowStock: boolean;
  outOfStock: boolean;
  updatedAt: string;
}

/**
 * Filtros + paginación de `GET /branches/{branchId}/inventory`. `sortBy` no
 * está restringido a un enum en APIDOC.json (a diferencia de Categoría/
 * Producto), así que queda como texto libre.
 */
export interface InventoryQuery extends PageQuery {
  lowStockOnly?: boolean;
}

/**
 * Entrada o salida manual de inventario, sin documento de origen
 * (`RegisterInventoryMovementRequest`, HU-12/HU-13). Compras, transferencias
 * y ajustes formales tienen su propio flujo y no se modelan aquí.
 */
export interface RegisterInventoryMovementInput {
  productId: string;
  quantity: number;
  reason: string;
}

/** Nuevo stock mínimo de un producto en una sucursal (`SetMinimumStockRequest`). */
export interface SetMinimumStockInput {
  minimumStock: number;
}

/** Movimiento de inventario del histórico auditable (`InventoryMovementResponse`). */
export interface InventoryMovement {
  id: string;
  inventoryId: string;
  movementType: string;
  direction: 'IN' | 'OUT';
  userId: string;
  quantity: number;
  unitCost: number | null;
  reason: string;
  /** Orden de compra de origen, si aplica. */
  purchaseOrderId: string | null;
  /** Venta de origen, si aplica. */
  saleId: string | null;
  /** Transferencia de origen, si aplica. */
  transferId: string | null;
  /** Ajuste de origen, si aplica. */
  adjustmentId: string | null;
  occurredAt: string;
  createdAt: string;
}
