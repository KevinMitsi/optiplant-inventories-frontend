import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { Branch, BranchQuery, CreateBranchInput, UpdateBranchInput } from '../../domain/models/branch.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import { BranchResponseDto, CreateBranchRequestDto, UpdateBranchRequestDto } from '../http/dtos/branch.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toBranch } from '../mappers/branch.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class BranchHttpRepository extends BranchRepository {
  private readonly http = inject(HttpClient);

  override search(organizationId: string, query: BranchQuery): Observable<Page<Branch>> {
    return this.http
      .get<PageResponseDto<BranchResponseDto>>(ApiEndpoints.branches.search(organizationId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toBranch)));
  }

  override getById(branchId: string): Observable<Branch> {
    return this.http.get<BranchResponseDto>(ApiEndpoints.branches.byId(branchId)).pipe(map(toBranch));
  }

  override create(organizationId: string, input: CreateBranchInput): Observable<Branch> {
    const body: CreateBranchRequestDto = input;
    return this.http
      .post<BranchResponseDto>(ApiEndpoints.branches.create(organizationId), body)
      .pipe(map(toBranch));
  }

  override update(branchId: string, input: UpdateBranchInput): Observable<Branch> {
    const body: UpdateBranchRequestDto = input;
    return this.http
      .put<BranchResponseDto>(ApiEndpoints.branches.byId(branchId), body)
      .pipe(map(toBranch));
  }

  override activate(branchId: string): Observable<Branch> {
    return this.http
      .patch<BranchResponseDto>(ApiEndpoints.branches.activate(branchId), {})
      .pipe(map(toBranch));
  }

  override deactivate(branchId: string): Observable<Branch> {
    return this.http
      .patch<BranchResponseDto>(ApiEndpoints.branches.deactivate(branchId), {})
      .pipe(map(toBranch));
  }
}
