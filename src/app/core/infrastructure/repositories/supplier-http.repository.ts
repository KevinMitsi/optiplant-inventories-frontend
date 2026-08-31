import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier, SupplierQuery, CreateSupplierInput, UpdateSupplierInput } from '../../domain/models/supplier.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import { SupplierResponseDto, CreateSupplierRequestDto, UpdateSupplierRequestDto } from '../http/dtos/supplier.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toSupplier } from '../mappers/supplier.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class SupplierHttpRepository extends SupplierRepository {
  private readonly http = inject(HttpClient);

  override search(organizationId: string, query: SupplierQuery): Observable<Page<Supplier>> {
    return this.http
      .get<PageResponseDto<SupplierResponseDto>>(ApiEndpoints.suppliers.search(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toSupplier)));
  }

  override getById(supplierId: string): Observable<Supplier> {
    return this.http.get<SupplierResponseDto>(ApiEndpoints.suppliers.byId(supplierId)).pipe(map(toSupplier));
  }

  override create(organizationId: string, input: CreateSupplierInput): Observable<Supplier> {
    const body: CreateSupplierRequestDto = input;
    return this.http
      .post<SupplierResponseDto>(ApiEndpoints.suppliers.create(organizationId), body)
      .pipe(map(toSupplier));
  }

  override update(supplierId: string, input: UpdateSupplierInput): Observable<Supplier> {
    const body: UpdateSupplierRequestDto = input;
    return this.http
      .put<SupplierResponseDto>(ApiEndpoints.suppliers.byId(supplierId), body)
      .pipe(map(toSupplier));
  }

  override activate(supplierId: string): Observable<Supplier> {
    return this.http
      .post<SupplierResponseDto>(ApiEndpoints.suppliers.activate(supplierId), {})
      .pipe(map(toSupplier));
  }

  override deactivate(supplierId: string): Observable<Supplier> {
    return this.http
      .post<SupplierResponseDto>(ApiEndpoints.suppliers.deactivate(supplierId), {})
      .pipe(map(toSupplier));
  }
}
