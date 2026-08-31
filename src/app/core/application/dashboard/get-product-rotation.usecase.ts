import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { DashboardQuery, ProductRotation } from '../../domain/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class GetProductRotationUseCase {
  private readonly dashboardRepository = inject(DashboardRepository);

  execute(organizationId: string, query: DashboardQuery): Observable<ProductRotation[]> {
    return this.dashboardRepository.getProductRotation(organizationId, query);
  }
}
