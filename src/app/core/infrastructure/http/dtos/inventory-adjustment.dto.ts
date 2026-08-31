/** Formas de red exactas de `APIDOC.json` para ajustes de inventario. */

export interface InventoryAdjustmentItemResponseDto {
  id: string;
  productId: string;
  quantityDelta: number;
  reason: string;
}

export interface InventoryAdjustmentResponseDto {
  id: string;
  branchId: string;
  createdBy: string;
  approvedBy?: string | null;
  reason: string;
  approved: boolean;
  items: InventoryAdjustmentItemResponseDto[];
  createdAt: string;
  approvedAt?: string | null;
}

export interface InventoryAdjustmentItemRequestDto {
  productId: string;
  quantityDelta: number;
  reason?: string;
}

export interface CreateInventoryAdjustmentRequestDto {
  reason: string;
  items: InventoryAdjustmentItemRequestDto[];
}
