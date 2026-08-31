import { Sale, SaleItem } from '../../domain/models/sale.model';
import { SaleItemResponseDto, SaleResponseDto } from '../http/dtos/sale.dto';

export function toSaleItem(dto: SaleItemResponseDto): SaleItem {
  return {
    id: dto.id,
    productId: dto.productId,
    productUnitId: dto.productUnitId,
    quantity: dto.quantity,
    unitPrice: dto.unitPrice,
    discountPercentage: dto.discountPercentage,
  };
}

export function toSale(dto: SaleResponseDto): Sale {
  return {
    id: dto.id,
    branchId: dto.branchId,
    createdBy: dto.createdBy,
    priceListId: dto.priceListId ?? null,
    status: dto.status,
    saleNumber: dto.saleNumber,
    saleDate: dto.saleDate,
    notes: dto.notes,
    items: dto.items.map(toSaleItem),
    total: dto.total,
    createdAt: dto.createdAt,
  };
}
