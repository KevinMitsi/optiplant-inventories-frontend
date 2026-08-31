import { InventoryAlert } from '../../domain/models/inventory-alert.model';
import { InventoryAlertResponseDto } from '../http/dtos/inventory-alert.dto';

export function toInventoryAlert(dto: InventoryAlertResponseDto): InventoryAlert {
  return {
    id: dto.id,
    inventoryId: dto.inventoryId,
    alertType: dto.alertType,
    status: dto.status,
    triggeredQuantity: dto.triggeredQuantity,
    minimumStock: dto.minimumStock,
    message: dto.message,
    createdAt: dto.createdAt,
    resolvedAt: dto.resolvedAt ?? null,
  };
}
