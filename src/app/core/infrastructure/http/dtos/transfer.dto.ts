/** Formas de red exactas de `APIDOC.json` para transferencias entre sucursales. */

export interface TransferItemResponseDto {
  id: string;
  productId: string;
  productUnitId: string;
  requestedQuantity: number;
  approvedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
}

export interface TransferResponseDto {
  id: string;
  transferNumber: string;
  originBranchId: string;
  destinationBranchId: string;
  requestedBy: string;
  approvedBy: string | null;
  status: string;
  priority: string;
  carrierId: string | null;
  routeId: string | null;
  requestedAt: string;
  approvedAt: string | null;
  shippedAt: string | null;
  estimatedArrivalAt: string | null;
  receivedAt: string | null;
  notes: string;
  items: TransferItemResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TransferItemRequestDto {
  productId: string;
  productUnitId: string;
  quantity: number;
}

export interface CreateTransferRequestDto {
  destinationBranchId: string;
  transferNumber: string;
  priority?: string;
  notes?: string;
  items: TransferItemRequestDto[];
}

export interface ItemQuantityRequestDto {
  itemId: string;
  quantity: number;
}

export interface ApproveTransferRequestDto {
  approvedQuantities?: ItemQuantityRequestDto[];
}

export interface AssignTransferLogisticsRequestDto {
  carrierId: string;
  routeId: string;
  estimatedArrivalAt?: string;
}

export interface DispatchTransferRequestDto {
  shippedQuantities?: ItemQuantityRequestDto[];
}

export interface ReceiveTransferRequestDto {
  receivedQuantities?: ItemQuantityRequestDto[];
}

export interface ResolveTransferIssueRequestDto {
  resolutionType: string;
}

export interface TransferIssueResponseDto {
  id: string;
  transferItemId: string;
  issueType: string;
  resolutionType: string | null;
  quantity: number;
  description: string;
  reportedBy: string;
  reportedAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
}
