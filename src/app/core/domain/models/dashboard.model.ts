/**
 * Panel de KPIs de la organización (`/organizations/{organizationId}/dashboard/*`).
 * Los tres reportes son independientes entre sí (sin período explícito, el
 * backend usa los últimos 6 meses para ventas y rotación; comparación de
 * sucursales siempre es de los últimos 30 días).
 */
export interface SalesSummary {
  branchId: string;
  branchName: string;
  year: number;
  month: number;
  saleCount: number;
  totalAmount: number;
}

export interface ProductRotation {
  productId: string;
  productName: string;
  quantitySold: number;
  saleCount: number;
}

export interface BranchComparison {
  branchId: string;
  branchName: string;
  saleCount30d: number;
  totalSalesAmount30d: number;
  inventoryValue: number;
  lowStockCount: number;
}

export interface DashboardQuery {
  branchId?: string;
  from?: string;
  to?: string;
}
