import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import {
  CreatePriceListInput,
  PriceList,
  PriceListQuery,
  UpdatePriceListInput,
} from '../../domain/models/price-list.model';
import { ProductPrice, SetProductPriceInput } from '../../domain/models/product-price.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import {
  CreatePriceListRequestDto,
  PriceListResponseDto,
  ProductPriceResponseDto,
  SetProductPriceRequestDto,
  UpdatePriceListRequestDto,
} from '../http/dtos/price-list.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toPriceList, toProductPrice } from '../mappers/price-list.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class PriceListHttpRepository extends PriceListRepository {
  private readonly http = inject(HttpClient);

  override search(organizationId: string, query: PriceListQuery): Observable<Page<PriceList>> {
    return this.http
      .get<PageResponseDto<PriceListResponseDto>>(ApiEndpoints.priceLists.search(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toPriceList)));
  }

  override getById(priceListId: string): Observable<PriceList> {
    return this.http.get<PriceListResponseDto>(ApiEndpoints.priceLists.byId(priceListId)).pipe(map(toPriceList));
  }

  override create(organizationId: string, input: CreatePriceListInput): Observable<PriceList> {
    const body: CreatePriceListRequestDto = input;
    return this.http
      .post<PriceListResponseDto>(ApiEndpoints.priceLists.create(organizationId), body)
      .pipe(map(toPriceList));
  }

  override update(priceListId: string, input: UpdatePriceListInput): Observable<PriceList> {
    const body: UpdatePriceListRequestDto = input;
    return this.http
      .put<PriceListResponseDto>(ApiEndpoints.priceLists.byId(priceListId), body)
      .pipe(map(toPriceList));
  }

  override activate(priceListId: string): Observable<PriceList> {
    return this.http
      .post<PriceListResponseDto>(ApiEndpoints.priceLists.activate(priceListId), {})
      .pipe(map(toPriceList));
  }

  override deactivate(priceListId: string): Observable<PriceList> {
    return this.http
      .post<PriceListResponseDto>(ApiEndpoints.priceLists.deactivate(priceListId), {})
      .pipe(map(toPriceList));
  }

  override getProductPrice(
    priceListId: string,
    productId: string,
    productUnitId: string,
  ): Observable<ProductPrice> {
    return this.http
      .get<ProductPriceResponseDto>(ApiEndpoints.priceLists.productPrices(priceListId), {
        params: toHttpParams({ productId, productUnitId }),
      })
      .pipe(map(toProductPrice));
  }

  override setProductPrice(priceListId: string, input: SetProductPriceInput): Observable<ProductPrice> {
    const body: SetProductPriceRequestDto = input;
    return this.http
      .post<ProductPriceResponseDto>(ApiEndpoints.priceLists.productPrices(priceListId), body)
      .pipe(map(toProductPrice));
  }
}
