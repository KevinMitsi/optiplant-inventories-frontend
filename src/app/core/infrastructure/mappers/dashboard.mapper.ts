import { BranchComparison, ProductRotation, SalesSummary } from '../../domain/models/dashboard.model';
import {
  BranchComparisonResponseDto,
  ProductRotationResponseDto,
  SalesSummaryResponseDto,
} from '../http/dtos/dashboard.dto';

export function toSalesSummary(dto: SalesSummaryResponseDto): SalesSummary {
  return {
    branchId: dto.branchId,
    branchName: dto.branchName,
    year: dto.year,
    month: dto.month,
    saleCount: dto.saleCount,
    totalAmount: dto.totalAmount,
  };
}

export function toProductRotation(dto: ProductRotationResponseDto): ProductRotation {
  return {
    productId: dto.productId,
    productName: dto.productName,
    quantitySold: dto.quantitySold,
    saleCount: dto.saleCount,
  };
}

export function toBranchComparison(dto: BranchComparisonResponseDto): BranchComparison {
  return {
    branchId: dto.branchId,
    branchName: dto.branchName,
    saleCount30d: dto.saleCount30d,
    totalSalesAmount30d: dto.totalSalesAmount30d,
    inventoryValue: dto.inventoryValue,
    lowStockCount: dto.lowStockCount,
  };
}
