/** Formas de red exactas de `APIDOC.json` para inventario. Aisladas aquí; el
 * resto de la app trabaja con `core/domain/models/inventory.model.ts`. */

export interface InventoryResponseDto {
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

export interface RegisterInventoryMovementRequestDto {
  productId: string;
  quantity: number;
  reason: string;
}

export interface SetMinimumStockRequestDto {
  minimumStock: number;
}

export interface InventoryMovementResponseDto {
  id: string;
  inventoryId: string;
  movementType: string;
  direction: string;
  userId: string;
  quantity: number;
  unitCost?: number;
  reason: string;
  purchaseOrderId?: string | null;
  saleId?: string | null;
  transferId?: string | null;
  adjustmentId?: string | null;
  occurredAt: string;
  createdAt: string;
}
