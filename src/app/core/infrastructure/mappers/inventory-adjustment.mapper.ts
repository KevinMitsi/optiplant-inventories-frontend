import { InventoryAdjustment, InventoryAdjustmentItem } from '../../domain/models/inventory-adjustment.model';
import { InventoryAdjustmentItemResponseDto, InventoryAdjustmentResponseDto } from '../http/dtos/inventory-adjustment.dto';

export function toInventoryAdjustmentItem(dto: InventoryAdjustmentItemResponseDto): InventoryAdjustmentItem {
  return {
    id: dto.id,
    productId: dto.productId,
    quantityDelta: dto.quantityDelta,
    reason: dto.reason,
  };
}

export function toInventoryAdjustment(dto: InventoryAdjustmentResponseDto): InventoryAdjustment {
  return {
    id: dto.id,
    branchId: dto.branchId,
    createdBy: dto.createdBy,
    approvedBy: dto.approvedBy ?? null,
    reason: dto.reason,
    approved: dto.approved,
    items: dto.items.map(toInventoryAdjustmentItem),
    createdAt: dto.createdAt,
    approvedAt: dto.approvedAt ?? null,
  };
}
