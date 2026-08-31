import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import {
  AddProductUnitInput,
  ChangeBaseUnitInput,
  ChangeUnitFactorInput,
  CreateProductInput,
  Product,
  ProductQuery,
  UpdateProductInput,
} from '../../domain/models/product.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import {
  AddProductUnitRequestDto,
  ChangeBaseUnitRequestDto,
  ChangeUnitFactorRequestDto,
  CreateProductRequestDto,
  ProductResponseDto,
  UpdateProductRequestDto,
} from '../http/dtos/product.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toProduct } from '../mappers/product.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class ProductHttpRepository extends ProductRepository {
  private readonly http = inject(HttpClient);

  override search(organizationId: string, query: ProductQuery): Observable<Page<Product>> {
    return this.http
      .get<PageResponseDto<ProductResponseDto>>(ApiEndpoints.products.search(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toProduct)));
  }

  override getById(productId: string): Observable<Product> {
    return this.http.get<ProductResponseDto>(ApiEndpoints.products.byId(productId)).pipe(map(toProduct));
  }

  override create(organizationId: string, input: CreateProductInput): Observable<Product> {
    const body: CreateProductRequestDto = input;
    return this.http
      .post<ProductResponseDto>(ApiEndpoints.products.create(organizationId), body)
      .pipe(map(toProduct));
  }

  override update(productId: string, input: UpdateProductInput): Observable<Product> {
    const body: UpdateProductRequestDto = input;
    return this.http.put<ProductResponseDto>(ApiEndpoints.products.byId(productId), body).pipe(map(toProduct));
  }

  override activate(productId: string): Observable<Product> {
    return this.http.post<ProductResponseDto>(ApiEndpoints.products.activate(productId), {}).pipe(map(toProduct));
  }

  override deactivate(productId: string): Observable<Product> {
    return this.http.post<ProductResponseDto>(ApiEndpoints.products.deactivate(productId), {}).pipe(map(toProduct));
  }

  override addUnit(productId: string, input: AddProductUnitInput): Observable<Product> {
    const body: AddProductUnitRequestDto = input;
    return this.http.post<ProductResponseDto>(ApiEndpoints.products.addUnit(productId), body).pipe(map(toProduct));
  }

  override changeUnitFactor(
    productId: string,
    productUnitId: string,
    input: ChangeUnitFactorInput,
  ): Observable<Product> {
    const body: ChangeUnitFactorRequestDto = input;
    return this.http
      .patch<ProductResponseDto>(ApiEndpoints.products.unitFactor(productId, productUnitId), body)
      .pipe(map(toProduct));
  }

  override activateUnit(productId: string, productUnitId: string): Observable<Product> {
    return this.http
      .post<ProductResponseDto>(ApiEndpoints.products.activateUnit(productId, productUnitId), {})
      .pipe(map(toProduct));
  }

  override deactivateUnit(productId: string, productUnitId: string): Observable<Product> {
    return this.http
      .post<ProductResponseDto>(ApiEndpoints.products.deactivateUnit(productId, productUnitId), {})
      .pipe(map(toProduct));
  }

  override changeBaseUnit(productId: string, input: ChangeBaseUnitInput): Observable<Product> {
    const body: ChangeBaseUnitRequestDto = input;
    return this.http
      .patch<ProductResponseDto>(ApiEndpoints.products.baseUnit(productId), body)
      .pipe(map(toProduct));
  }
}
