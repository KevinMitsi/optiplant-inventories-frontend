import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryAlertRepository } from '../../domain/repositories/inventory-alert.repository';
import { InventoryAlert } from '../../domain/models/inventory-alert.model';

/** Cierre manual; normalmente la resuelve el propio sistema al ver el stock recuperado. */
@Injectable({ providedIn: 'root' })
export class ResolveInventoryAlertUseCase {
  private readonly inventoryAlertRepository = inject(InventoryAlertRepository);

  execute(alertId: string): Observable<InventoryAlert> {
    return this.inventoryAlertRepository.resolve(alertId);
  }
}
