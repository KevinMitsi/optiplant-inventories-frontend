import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import {
  CreatePurchaseOrderInput,
  PurchaseOrder,
  PurchaseOrderQuery,
  ReceivePurchaseOrderItemInput,
} from '../../domain/models/purchase-order.model';
import { Page } from '../../domain/models/page.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { toHttpParams } from '../http/http-params.util';
import {
  CreatePurchaseOrderRequestDto,
  PurchaseOrderResponseDto,
  ReceivePurchaseOrderItemRequestDto,
} from '../http/dtos/purchase-order.dto';
import { PageResponseDto } from '../http/dtos/page.dto';
import { toPurchaseOrder } from '../mappers/purchase-order.mapper';
import { toPage } from '../mappers/page.mapper';

@Injectable()
export class PurchaseOrderHttpRepository extends PurchaseOrderRepository {
  private readonly http = inject(HttpClient);

  override search(branchId: string, query: PurchaseOrderQuery): Observable<Page<PurchaseOrder>> {
    return this.http
      .get<PageResponseDto<PurchaseOrderResponseDto>>(ApiEndpoints.purchaseOrders.search(branchId), {
        params: toHttpParams(query),
      })
      .pipe(map((dto) => toPage(dto, toPurchaseOrder)));
  }

  override create(branchId: string, input: CreatePurchaseOrderInput): Observable<PurchaseOrder> {
    const body: CreatePurchaseOrderRequestDto = input;
    return this.http
      .post<PurchaseOrderResponseDto>(ApiEndpoints.purchaseOrders.create(branchId), body)
      .pipe(map(toPurchaseOrder));
  }

  override getById(purchaseOrderId: string): Observable<PurchaseOrder> {
    return this.http
      .get<PurchaseOrderResponseDto>(ApiEndpoints.purchaseOrders.byId(purchaseOrderId))
      .pipe(map(toPurchaseOrder));
  }

  override confirm(purchaseOrderId: string): Observable<PurchaseOrder> {
    return this.http
      .post<PurchaseOrderResponseDto>(ApiEndpoints.purchaseOrders.confirm(purchaseOrderId), {})
      .pipe(map(toPurchaseOrder));
  }

  override cancel(purchaseOrderId: string): Observable<PurchaseOrder> {
    return this.http
      .post<PurchaseOrderResponseDto>(ApiEndpoints.purchaseOrders.cancel(purchaseOrderId), {})
      .pipe(map(toPurchaseOrder));
  }

  override receiveItem(
    purchaseOrderId: string,
    itemId: string,
    input: ReceivePurchaseOrderItemInput,
  ): Observable<PurchaseOrder> {
    const body: ReceivePurchaseOrderItemRequestDto = input;
    return this.http
      .post<PurchaseOrderResponseDto>(ApiEndpoints.purchaseOrders.receiveItem(purchaseOrderId, itemId), body)
      .pipe(map(toPurchaseOrder));
  }
}
