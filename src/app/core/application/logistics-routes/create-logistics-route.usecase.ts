import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LogisticsRouteRepository } from '../../domain/repositories/logistics-route.repository';
import { CreateLogisticsRouteInput, LogisticsRoute } from '../../domain/models/logistics-route.model';

@Injectable({ providedIn: 'root' })
export class CreateLogisticsRouteUseCase {
  private readonly logisticsRouteRepository = inject(LogisticsRouteRepository);

  execute(organizationId: string, input: CreateLogisticsRouteInput): Observable<LogisticsRoute> {
    return this.logisticsRouteRepository.create(organizationId, input);
  }
}
