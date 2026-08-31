import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryAdjustmentRepository } from '../../domain/repositories/inventory-adjustment.repository';
import { InventoryAdjustment } from '../../domain/models/inventory-adjustment.model';

@Injectable({ providedIn: 'root' })
export class GetInventoryAdjustmentUseCase {
  private readonly inventoryAdjustmentRepository = inject(InventoryAdjustmentRepository);

  execute(adjustmentId: string): Observable<InventoryAdjustment> {
    return this.inventoryAdjustmentRepository.getById(adjustmentId);
  }
}
