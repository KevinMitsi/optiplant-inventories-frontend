import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LogisticsRouteRepository } from '../../domain/repositories/logistics-route.repository';
import { LogisticsRoute, UpdateLogisticsRouteInput } from '../../domain/models/logistics-route.model';

@Injectable({ providedIn: 'root' })
export class UpdateLogisticsRouteUseCase {
  private readonly logisticsRouteRepository = inject(LogisticsRouteRepository);

  execute(routeId: string, input: UpdateLogisticsRouteInput): Observable<LogisticsRoute> {
    return this.logisticsRouteRepository.update(routeId, input);
  }
}
