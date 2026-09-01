import { Inventory, InventoryMovement } from '../../domain/models/inventory.model';
import { InventoryMovementResponseDto, InventoryResponseDto } from '../http/dtos/inventory.dto';

export function toInventory(dto: InventoryResponseDto): Inventory {
  return {
    id: dto.id,
    branchId: dto.branchId,
    productId: dto.productId,
    quantity: dto.quantity,
    minimumStock: dto.minimumStock,
    averageCost: dto.averageCost,
    lowStock: dto.lowStock,
    outOfStock: dto.outOfStock,
    updatedAt: dto.updatedAt,
  };
}

export function toInventoryMovement(dto: InventoryMovementResponseDto): InventoryMovement {
  return {
    id: dto.id,
    inventoryId: dto.inventoryId,
    movementType: dto.movementType,
    direction: dto.direction === 'OUT' ? 'OUT' : 'IN',
    userId: dto.userId,
    quantity: dto.quantity,
    unitCost: dto.unitCost ?? null,
    reason: dto.reason,
    purchaseOrderId: dto.purchaseOrderId ?? null,
    saleId: dto.saleId ?? null,
    transferId: dto.transferId ?? null,
    adjustmentId: dto.adjustmentId ?? null,
    occurredAt: dto.occurredAt,
    createdAt: dto.createdAt,
  };
}
