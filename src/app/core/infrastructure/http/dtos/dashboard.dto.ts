/** Forma de red exacta de `APIDOC.json` para los reportes del panel. */

export interface SalesSummaryResponseDto {
  branchId: string;
  branchName: string;
  year: number;
  month: number;
  saleCount: number;
  totalAmount: number;
}

export interface ProductRotationResponseDto {
  productId: string;
  productName: string;
  quantitySold: number;
  saleCount: number;
}

export interface BranchComparisonResponseDto {
  branchId: string;
  branchName: string;
  saleCount30d: number;
  totalSalesAmount30d: number;
  inventoryValue: number;
  lowStockCount: number;
}
