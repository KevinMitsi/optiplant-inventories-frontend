import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import {
  CreateProductInput,
  CreateProductVariantInput,
  Product,
  ProductFamily,
  ProductQuery,
  UpdateProductInput,
} from '../../domain/models/product.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import {
  CreateProductRequestDto,
  ProductFamilyResponseDto,
  ProductResponseDto,
  ProductVariantRequestDto,
  UpdateProductRequestDto,
} from '../http/dtos/product.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toProduct, toProductFamily } from '../mappers/product.mapper';
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

  override create(organizationId: string, input: CreateProductInput): Observable<ProductFamily> {
    const body: CreateProductRequestDto = input;
    return this.http
      .post<ProductFamilyResponseDto>(ApiEndpoints.products.create(organizationId), body)
      .pipe(map(toProductFamily));
  }

  override update(productId: string, input: UpdateProductInput): Observable<Product> {
    const body: UpdateProductRequestDto = input;
    return this.http.put<ProductResponseDto>(ApiEndpoints.products.byId(productId), body).pipe(map(toProduct));
  }

  override activate(productId: string): Observable<Product> {
    return this.http.patch<ProductResponseDto>(ApiEndpoints.products.activate(productId), {}).pipe(map(toProduct));
  }

  override deactivate(productId: string): Observable<Product> {
    return this.http.patch<ProductResponseDto>(ApiEndpoints.products.deactivate(productId), {}).pipe(map(toProduct));
  }

  override getFamily(productId: string): Observable<ProductFamily> {
    return this.http
      .get<ProductFamilyResponseDto>(ApiEndpoints.products.family(productId))
      .pipe(map(toProductFamily));
  }

  override listVariants(productId: string): Observable<Product[]> {
    return this.http
      .get<ProductResponseDto[]>(ApiEndpoints.products.variants(productId))
      .pipe(map((dtos) => dtos.map(toProduct)));
  }

  override addVariant(productId: string, input: CreateProductVariantInput): Observable<Product> {
    const body: ProductVariantRequestDto = input;
    return this.http
      .post<ProductResponseDto>(ApiEndpoints.products.variants(productId), body)
      .pipe(map(toProduct));
  }
}
