/** Formas de red exactas de `APIDOC.json` para ventas. */

export interface SaleItemResponseDto {
  id: string;
  productId: string;
  productUnitId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
}

export interface SaleResponseDto {
  id: string;
  branchId: string;
  createdBy: string;
  priceListId?: string | null;
  status: string;
  saleNumber: string;
  saleDate: string;
  notes: string;
  items: SaleItemResponseDto[];
  total: number;
  createdAt: string;
}

export interface SaleItemRequestDto {
  productId: string;
  productUnitId: string;
  quantity: number;
  unitPrice?: number;
  discountPercentage?: number;
}

export interface CreateSaleRequestDto {
  priceListId?: string;
  saleNumber: string;
  saleDate: string;
  notes?: string;
  items: SaleItemRequestDto[];
}
