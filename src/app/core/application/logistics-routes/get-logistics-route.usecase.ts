import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LogisticsRouteRepository } from '../../domain/repositories/logistics-route.repository';
import { LogisticsRoute } from '../../domain/models/logistics-route.model';

@Injectable({ providedIn: 'root' })
export class GetLogisticsRouteUseCase {
  private readonly logisticsRouteRepository = inject(LogisticsRouteRepository);

  execute(routeId: string): Observable<LogisticsRoute> {
    return this.logisticsRouteRepository.getById(routeId);
  }
}
