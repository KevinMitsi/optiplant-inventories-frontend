import { Observable } from 'rxjs';
import { BranchComparison, DashboardQuery, ProductRotation, SalesSummary } from '../models/dashboard.model';

/** Puerto de dominio para los reportes del panel (ver `dashboard.model.ts`). */
export abstract class DashboardRepository {
  abstract getSalesSummary(organizationId: string, query: DashboardQuery): Observable<SalesSummary[]>;
  abstract getProductRotation(organizationId: string, query: DashboardQuery): Observable<ProductRotation[]>;
  abstract getBranchComparison(organizationId: string): Observable<BranchComparison[]>;
}
