import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { Category, CategoryQuery, CreateCategoryInput, UpdateCategoryInput } from '../../domain/models/category.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import { CategoryResponseDto, CreateCategoryRequestDto, UpdateCategoryRequestDto } from '../http/dtos/category.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toCategory } from '../mappers/category.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class CategoryHttpRepository extends CategoryRepository {
  private readonly http = inject(HttpClient);

  override search(organizationId: string, query: CategoryQuery): Observable<Page<Category>> {
    return this.http
      .get<PageResponseDto<CategoryResponseDto>>(ApiEndpoints.categories.search(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toCategory)));
  }

  override getById(categoryId: string): Observable<Category> {
    return this.http.get<CategoryResponseDto>(ApiEndpoints.categories.byId(categoryId)).pipe(map(toCategory));
  }

  override create(organizationId: string, input: CreateCategoryInput): Observable<Category> {
    const body: CreateCategoryRequestDto = input;
    return this.http
      .post<CategoryResponseDto>(ApiEndpoints.categories.create(organizationId), body)
      .pipe(map(toCategory));
  }

  override update(categoryId: string, input: UpdateCategoryInput): Observable<Category> {
    const body: UpdateCategoryRequestDto = input;
    return this.http
      .put<CategoryResponseDto>(ApiEndpoints.categories.byId(categoryId), body)
      .pipe(map(toCategory));
  }

  override activate(categoryId: string): Observable<Category> {
    return this.http
      .patch<CategoryResponseDto>(ApiEndpoints.categories.activate(categoryId), {})
      .pipe(map(toCategory));
  }

  override deactivate(categoryId: string): Observable<Category> {
    return this.http
      .patch<CategoryResponseDto>(ApiEndpoints.categories.deactivate(categoryId), {})
      .pipe(map(toCategory));
  }
}
