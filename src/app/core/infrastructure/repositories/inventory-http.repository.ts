import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import {
  Inventory,
  InventoryMovement,
  InventoryQuery,
  RegisterInventoryMovementInput,
  SetMinimumStockInput,
} from '../../domain/models/inventory.model';
import { Page } from '../../domain/models/page.model';
import { PageQuery } from '../../domain/models/page-query.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import {
  InventoryMovementResponseDto,
  InventoryResponseDto,
  RegisterInventoryMovementRequestDto,
  SetMinimumStockRequestDto,
} from '../http/dtos/inventory.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toInventory, toInventoryMovement } from '../mappers/inventory.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class InventoryHttpRepository extends InventoryRepository {
  private readonly http = inject(HttpClient);

  override search(branchId: string, query: InventoryQuery): Observable<Page<Inventory>> {
    return this.http
      .get<PageResponseDto<InventoryResponseDto>>(ApiEndpoints.inventory.search(branchId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toInventory)));
  }

  override getByProduct(branchId: string, productId: string): Observable<Inventory> {
    return this.http
      .get<InventoryResponseDto>(ApiEndpoints.inventory.byProduct(branchId, productId))
      .pipe(map(toInventory));
  }

  override setMinimumStock(
    branchId: string,
    productId: string,
    input: SetMinimumStockInput,
  ): Observable<Inventory> {
    const body: SetMinimumStockRequestDto = input;
    return this.http
      .patch<InventoryResponseDto>(ApiEndpoints.inventory.minimumStock(branchId, productId), body)
      .pipe(map(toInventory));
  }

  override registerEntry(branchId: string, input: RegisterInventoryMovementInput): Observable<InventoryMovement> {
    const body: RegisterInventoryMovementRequestDto = input;
    return this.http
      .post<InventoryMovementResponseDto>(ApiEndpoints.inventory.entries(branchId), body)
      .pipe(map(toInventoryMovement));
  }

  override registerExit(branchId: string, input: RegisterInventoryMovementInput): Observable<InventoryMovement> {
    const body: RegisterInventoryMovementRequestDto = input;
    return this.http
      .post<InventoryMovementResponseDto>(ApiEndpoints.inventory.exits(branchId), body)
      .pipe(map(toInventoryMovement));
  }

  override getMovementHistory(
    branchId: string,
    productId: string,
    query: PageQuery,
  ): Observable<Page<InventoryMovement>> {
    return this.http
      .get<PageResponseDto<InventoryMovementResponseDto>>(ApiEndpoints.inventory.movements(branchId, productId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toInventoryMovement)));
  }
}
