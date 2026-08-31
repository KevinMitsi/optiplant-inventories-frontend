import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { BranchComparison, DashboardQuery, ProductRotation, SalesSummary } from '../../domain/models/dashboard.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import {
  BranchComparisonResponseDto,
  ProductRotationResponseDto,
  SalesSummaryResponseDto,
} from '../http/dtos/dashboard.dto';
import { toBranchComparison, toProductRotation, toSalesSummary } from '../mappers/dashboard.mapper';

@Injectable()
export class DashboardHttpRepository extends DashboardRepository {
  private readonly http = inject(HttpClient);

  override getSalesSummary(organizationId: string, query: DashboardQuery): Observable<SalesSummary[]> {
    return this.http
      .get<SalesSummaryResponseDto[]>(ApiEndpoints.dashboard.salesSummary(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dtos) => dtos.map(toSalesSummary)));
  }

  override getProductRotation(organizationId: string, query: DashboardQuery): Observable<ProductRotation[]> {
    return this.http
      .get<ProductRotationResponseDto[]>(ApiEndpoints.dashboard.productRotation(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dtos) => dtos.map(toProductRotation)));
  }

  override getBranchComparison(organizationId: string): Observable<BranchComparison[]> {
    return this.http
      .get<BranchComparisonResponseDto[]>(ApiEndpoints.dashboard.branchComparison(organizationId))
      .pipe(map((dtos) => dtos.map(toBranchComparison)));
  }
}
