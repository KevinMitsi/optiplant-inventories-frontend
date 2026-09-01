import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { CreateSaleInput, Sale, SaleQuery } from '../../domain/models/sale.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import { CreateSaleRequestDto, SaleResponseDto } from '../http/dtos/sale.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toSale } from '../mappers/sale.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class SaleHttpRepository extends SaleRepository {
  private readonly http = inject(HttpClient);

  override search(branchId: string, query: SaleQuery): Observable<Page<Sale>> {
    return this.http
      .get<PageResponseDto<SaleResponseDto>>(ApiEndpoints.sales.search(branchId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toSale)));
  }

  override create(branchId: string, input: CreateSaleInput): Observable<Sale> {
    const body: CreateSaleRequestDto = input;
    return this.http.post<SaleResponseDto>(ApiEndpoints.sales.create(branchId), body).pipe(map(toSale));
  }

  override getById(saleId: string): Observable<Sale> {
    return this.http.get<SaleResponseDto>(ApiEndpoints.sales.byId(saleId)).pipe(map(toSale));
  }

  override confirm(saleId: string): Observable<Sale> {
    return this.http.patch<SaleResponseDto>(ApiEndpoints.sales.confirm(saleId), {}).pipe(map(toSale));
  }

  override cancel(saleId: string): Observable<Sale> {
    return this.http.patch<SaleResponseDto>(ApiEndpoints.sales.cancel(saleId), {}).pipe(map(toSale));
  }
}
