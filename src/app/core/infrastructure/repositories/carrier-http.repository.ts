import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CarrierRepository } from '../../domain/repositories/carrier.repository';
import { Carrier, CarrierQuery, CreateCarrierInput, UpdateCarrierInput } from '../../domain/models/carrier.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import { CarrierResponseDto, CreateCarrierRequestDto, UpdateCarrierRequestDto } from '../http/dtos/carrier.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toCarrier } from '../mappers/carrier.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class CarrierHttpRepository extends CarrierRepository {
  private readonly http = inject(HttpClient);

  override search(organizationId: string, query: CarrierQuery): Observable<Page<Carrier>> {
    return this.http
      .get<PageResponseDto<CarrierResponseDto>>(ApiEndpoints.carriers.search(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toCarrier)));
  }

  override getById(carrierId: string): Observable<Carrier> {
    return this.http.get<CarrierResponseDto>(ApiEndpoints.carriers.byId(carrierId)).pipe(map(toCarrier));
  }

  override create(organizationId: string, input: CreateCarrierInput): Observable<Carrier> {
    const body: CreateCarrierRequestDto = input;
    return this.http
      .post<CarrierResponseDto>(ApiEndpoints.carriers.create(organizationId), body)
      .pipe(map(toCarrier));
  }

  override update(carrierId: string, input: UpdateCarrierInput): Observable<Carrier> {
    const body: UpdateCarrierRequestDto = input;
    return this.http
      .put<CarrierResponseDto>(ApiEndpoints.carriers.byId(carrierId), body)
      .pipe(map(toCarrier));
  }

  override activate(carrierId: string): Observable<Carrier> {
    return this.http
      .post<CarrierResponseDto>(ApiEndpoints.carriers.activate(carrierId), {})
      .pipe(map(toCarrier));
  }

  override deactivate(carrierId: string): Observable<Carrier> {
    return this.http
      .post<CarrierResponseDto>(ApiEndpoints.carriers.deactivate(carrierId), {})
      .pipe(map(toCarrier));
  }
}
