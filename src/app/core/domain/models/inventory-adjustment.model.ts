/**
 * Ajuste formal de inventario (`InventoryAdjustmentResponse` en APIDOC.json):
 * corrección de stock con responsable y aprobador, a diferencia de la entrada/
 * salida manual sin documento de origen (`RegisterInventoryMovementRequest`,
 * Fase 6). Se crea en borrador con sus líneas y no mueve stock hasta que se
 * aprueba (`POST /inventory-adjustments/{id}/approval`), que postea un
 * `ADJUSTMENT_IN`/`ADJUSTMENT_OUT` por línea y vuelve el documento inmutable.
 */
export interface InventoryAdjustmentItem {
  id: string;
  productId: string;
  /** Cantidad con signo: positivo entra, negativo sale. */
  quantityDelta: number;
  reason: string;
}

export interface InventoryAdjustment {
  id: string;
  branchId: string;
  createdBy: string;
  /** Nulo mientras el ajuste sigue en borrador. */
  approvedBy: string | null;
  reason: string;
  approved: boolean;
  items: InventoryAdjustmentItem[];
  createdAt: string;
  /** Nula mientras el ajuste sigue en borrador. */
  approvedAt: string | null;
}

/** Línea de un ajuste en borrador (`InventoryAdjustmentItemRequest`). */
export interface CreateInventoryAdjustmentItemInput {
  productId: string;
  quantityDelta: number;
  reason?: string;
}

/** Datos de alta de un ajuste (`CreateInventoryAdjustmentRequest`); al menos una línea. */
export interface CreateInventoryAdjustmentInput {
  reason: string;
  items: CreateInventoryAdjustmentItemInput[];
}
