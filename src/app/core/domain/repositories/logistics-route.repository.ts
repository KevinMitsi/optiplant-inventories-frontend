import { Observable } from 'rxjs';
import {
  CreateLogisticsRouteInput,
  LogisticsRoute,
  LogisticsRouteQuery,
  UpdateLogisticsRouteInput,
} from '../models/logistics-route.model';
import { Page } from '../models/page.model';

/** Puerto de dominio para rutas logísticas. Mismo patrón que `CarrierRepository`. */
export abstract class LogisticsRouteRepository {
  abstract search(organizationId: string, query: LogisticsRouteQuery): Observable<Page<LogisticsRoute>>;
  abstract getById(routeId: string): Observable<LogisticsRoute>;
  abstract create(organizationId: string, input: CreateLogisticsRouteInput): Observable<LogisticsRoute>;
  abstract update(routeId: string, input: UpdateLogisticsRouteInput): Observable<LogisticsRoute>;
  abstract activate(routeId: string): Observable<LogisticsRoute>;
  abstract deactivate(routeId: string): Observable<LogisticsRoute>;
}
