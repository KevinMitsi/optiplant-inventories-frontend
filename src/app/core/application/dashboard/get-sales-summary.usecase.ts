import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { DashboardQuery, SalesSummary } from '../../domain/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class GetSalesSummaryUseCase {
  private readonly dashboardRepository = inject(DashboardRepository);

  execute(organizationId: string, query: DashboardQuery): Observable<SalesSummary[]> {
    return this.dashboardRepository.getSalesSummary(organizationId, query);
  }
}
