import { Transfer, TransferIssue, TransferItem } from '../../domain/models/transfer.model';
import { TransferItemResponseDto, TransferIssueResponseDto, TransferResponseDto } from '../http/dtos/transfer.dto';

export function toTransferItem(dto: TransferItemResponseDto): TransferItem {
  return {
    id: dto.id,
    productId: dto.productId,
    productUnitId: dto.productUnitId,
    requestedQuantity: dto.requestedQuantity,
    approvedQuantity: dto.approvedQuantity,
    shippedQuantity: dto.shippedQuantity,
    receivedQuantity: dto.receivedQuantity,
  };
}

export function toTransfer(dto: TransferResponseDto): Transfer {
  return {
    id: dto.id,
    transferNumber: dto.transferNumber,
    originBranchId: dto.originBranchId,
    destinationBranchId: dto.destinationBranchId,
    requestedBy: dto.requestedBy,
    approvedBy: dto.approvedBy,
    status: dto.status,
    priority: dto.priority,
    carrierId: dto.carrierId,
    routeId: dto.routeId,
    requestedAt: dto.requestedAt,
    approvedAt: dto.approvedAt,
    shippedAt: dto.shippedAt,
    estimatedArrivalAt: dto.estimatedArrivalAt,
    receivedAt: dto.receivedAt,
    notes: dto.notes,
    items: dto.items.map(toTransferItem),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toTransferIssue(dto: TransferIssueResponseDto): TransferIssue {
  return {
    id: dto.id,
    transferItemId: dto.transferItemId,
    issueType: dto.issueType,
    resolutionType: dto.resolutionType,
    quantity: dto.quantity,
    description: dto.description,
    reportedBy: dto.reportedBy,
    reportedAt: dto.reportedAt,
    resolvedBy: dto.resolvedBy,
    resolvedAt: dto.resolvedAt,
  };
}
