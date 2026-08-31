import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { BranchComparison } from '../../domain/models/dashboard.model';

/** Reservado al administrador general (RN-12) — el backend impone el 403 si otro rol lo intenta. */
@Injectable({ providedIn: 'root' })
export class GetBranchComparisonUseCase {
  private readonly dashboardRepository = inject(DashboardRepository);

  execute(organizationId: string): Observable<BranchComparison[]> {
    return this.dashboardRepository.getBranchComparison(organizationId);
  }
}
