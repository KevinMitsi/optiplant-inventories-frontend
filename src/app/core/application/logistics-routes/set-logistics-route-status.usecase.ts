import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LogisticsRouteRepository } from '../../domain/repositories/logistics-route.repository';
import { LogisticsRoute } from '../../domain/models/logistics-route.model';

/** Activa o desactiva una ruta logística (baja lógica, nunca borrado). */
@Injectable({ providedIn: 'root' })
export class SetLogisticsRouteStatusUseCase {
  private readonly logisticsRouteRepository = inject(LogisticsRouteRepository);

  execute(routeId: string, active: boolean): Observable<LogisticsRoute> {
    return active
      ? this.logisticsRouteRepository.activate(routeId)
      : this.logisticsRouteRepository.deactivate(routeId);
  }
}
