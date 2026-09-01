import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { InventoryAdjustmentRepository } from '../../domain/repositories/inventory-adjustment.repository';
import { CreateInventoryAdjustmentInput, InventoryAdjustment } from '../../domain/models/inventory-adjustment.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { CreateInventoryAdjustmentRequestDto, InventoryAdjustmentResponseDto } from '../http/dtos/inventory-adjustment.dto';
import { toInventoryAdjustment } from '../mappers/inventory-adjustment.mapper';

@Injectable()
export class InventoryAdjustmentHttpRepository extends InventoryAdjustmentRepository {
  private readonly http = inject(HttpClient);

  override create(branchId: string, input: CreateInventoryAdjustmentInput): Observable<InventoryAdjustment> {
    const body: CreateInventoryAdjustmentRequestDto = input;
    return this.http
      .post<InventoryAdjustmentResponseDto>(ApiEndpoints.inventoryAdjustments.create(branchId), body)
      .pipe(map(toInventoryAdjustment));
  }

  override getById(adjustmentId: string): Observable<InventoryAdjustment> {
    return this.http
      .get<InventoryAdjustmentResponseDto>(ApiEndpoints.inventoryAdjustments.byId(adjustmentId))
      .pipe(map(toInventoryAdjustment));
  }

  override approve(adjustmentId: string): Observable<InventoryAdjustment> {
    return this.http
      .patch<InventoryAdjustmentResponseDto>(ApiEndpoints.inventoryAdjustments.approve(adjustmentId), {})
      .pipe(map(toInventoryAdjustment));
  }
}
