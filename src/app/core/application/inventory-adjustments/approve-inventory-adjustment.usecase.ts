import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryAdjustmentRepository } from '../../domain/repositories/inventory-adjustment.repository';
import { InventoryAdjustment } from '../../domain/models/inventory-adjustment.model';

/** Confirma el ajuste y postea `ADJUSTMENT_IN`/`ADJUSTMENT_OUT` por línea. A partir de aquí el documento es inmutable. */
@Injectable({ providedIn: 'root' })
export class ApproveInventoryAdjustmentUseCase {
  private readonly inventoryAdjustmentRepository = inject(InventoryAdjustmentRepository);

  execute(adjustmentId: string): Observable<InventoryAdjustment> {
    return this.inventoryAdjustmentRepository.approve(adjustmentId);
  }
}
