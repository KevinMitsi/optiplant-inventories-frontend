import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { LogisticsRouteRepository } from '../../domain/repositories/logistics-route.repository';
import {
  CreateLogisticsRouteInput,
  LogisticsRoute,
  LogisticsRouteQuery,
  UpdateLogisticsRouteInput,
} from '../../domain/models/logistics-route.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import {
  CreateLogisticsRouteRequestDto,
  LogisticsRouteResponseDto,
  UpdateLogisticsRouteRequestDto,
} from '../http/dtos/logistics-route.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toLogisticsRoute } from '../mappers/logistics-route.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class LogisticsRouteHttpRepository extends LogisticsRouteRepository {
  private readonly http = inject(HttpClient);

  override search(organizationId: string, query: LogisticsRouteQuery): Observable<Page<LogisticsRoute>> {
    return this.http
      .get<PageResponseDto<LogisticsRouteResponseDto>>(ApiEndpoints.logisticsRoutes.search(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toLogisticsRoute)));
  }

  override getById(routeId: string): Observable<LogisticsRoute> {
    return this.http
      .get<LogisticsRouteResponseDto>(ApiEndpoints.logisticsRoutes.byId(routeId))
      .pipe(map(toLogisticsRoute));
  }

  override create(organizationId: string, input: CreateLogisticsRouteInput): Observable<LogisticsRoute> {
    const body: CreateLogisticsRouteRequestDto = input;
    return this.http
      .post<LogisticsRouteResponseDto>(ApiEndpoints.logisticsRoutes.create(organizationId), body)
      .pipe(map(toLogisticsRoute));
  }

  override update(routeId: string, input: UpdateLogisticsRouteInput): Observable<LogisticsRoute> {
    const body: UpdateLogisticsRouteRequestDto = input;
    return this.http
      .put<LogisticsRouteResponseDto>(ApiEndpoints.logisticsRoutes.byId(routeId), body)
      .pipe(map(toLogisticsRoute));
  }

  override activate(routeId: string): Observable<LogisticsRoute> {
    return this.http
      .post<LogisticsRouteResponseDto>(ApiEndpoints.logisticsRoutes.activate(routeId), {})
      .pipe(map(toLogisticsRoute));
  }

  override deactivate(routeId: string): Observable<LogisticsRoute> {
    return this.http
      .post<LogisticsRouteResponseDto>(ApiEndpoints.logisticsRoutes.deactivate(routeId), {})
      .pipe(map(toLogisticsRoute));
  }
}
