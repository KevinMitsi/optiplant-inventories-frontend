import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LogisticsRouteRepository } from '../../domain/repositories/logistics-route.repository';
import { LogisticsRoute, LogisticsRouteQuery } from '../../domain/models/logistics-route.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchLogisticsRoutesUseCase {
  private readonly logisticsRouteRepository = inject(LogisticsRouteRepository);

  execute(organizationId: string, query: LogisticsRouteQuery): Observable<Page<LogisticsRoute>> {
    return this.logisticsRouteRepository.search(organizationId, query);
  }
}
