import { PurchaseOrder, PurchaseOrderItem } from '../../domain/models/purchase-order.model';
import { PurchaseOrderItemResponseDto, PurchaseOrderResponseDto } from '../http/dtos/purchase-order.dto';

export function toPurchaseOrderItem(dto: PurchaseOrderItemResponseDto): PurchaseOrderItem {
  return {
    id: dto.id,
    productId: dto.productId,
    productUnitId: dto.productUnitId,
    quantity: dto.quantity,
    receivedQuantity: dto.receivedQuantity,
    unitPrice: dto.unitPrice,
    discountPercentage: dto.discountPercentage,
  };
}

export function toPurchaseOrder(dto: PurchaseOrderResponseDto): PurchaseOrder {
  return {
    id: dto.id,
    branchId: dto.branchId,
    supplierId: dto.supplierId,
    createdBy: dto.createdBy,
    status: dto.status,
    orderNumber: dto.orderNumber,
    orderDate: dto.orderDate,
    paymentTermDays: dto.paymentTermDays,
    notes: dto.notes,
    items: dto.items.map(toPurchaseOrderItem),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
