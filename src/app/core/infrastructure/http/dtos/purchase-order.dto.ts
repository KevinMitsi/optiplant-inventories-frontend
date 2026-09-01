/** Formas de red exactas de `APIDOC.json` para órdenes de compra. */

export interface PurchaseOrderItemResponseDto {
  id: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  discountPercentage: number;
}

export interface PurchaseOrderResponseDto {
  id: string;
  branchId: string;
  supplierId: string;
  createdBy: string;
  status: string;
  orderNumber: string;
  orderDate: string;
  paymentTermDays: number;
  notes: string;
  items: PurchaseOrderItemResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemRequestDto {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
}

export interface CreatePurchaseOrderRequestDto {
  supplierId: string;
  orderNumber: string;
  orderDate: string;
  paymentTermDays?: number;
  notes?: string;
  items: PurchaseOrderItemRequestDto[];
}

export interface ReceivePurchaseOrderItemRequestDto {
  quantityReceived: number;
}
