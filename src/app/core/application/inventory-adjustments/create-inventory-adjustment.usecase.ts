import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryAdjustmentRepository } from '../../domain/repositories/inventory-adjustment.repository';
import { CreateInventoryAdjustmentInput, InventoryAdjustment } from '../../domain/models/inventory-adjustment.model';

@Injectable({ providedIn: 'root' })
export class CreateInventoryAdjustmentUseCase {
  private readonly inventoryAdjustmentRepository = inject(InventoryAdjustmentRepository);

  execute(branchId: string, input: CreateInventoryAdjustmentInput): Observable<InventoryAdjustment> {
    return this.inventoryAdjustmentRepository.create(branchId, input);
  }
}
