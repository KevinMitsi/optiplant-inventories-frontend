import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryAlertRepository } from '../../domain/repositories/inventory-alert.repository';
import { InventoryAlert } from '../../domain/models/inventory-alert.model';

/** Cierra la alerta sin que el stock haya cambiado (p. ej. reabastecimiento ya en camino). */
@Injectable({ providedIn: 'root' })
export class DismissInventoryAlertUseCase {
  private readonly inventoryAlertRepository = inject(InventoryAlertRepository);

  execute(alertId: string): Observable<InventoryAlert> {
    return this.inventoryAlertRepository.dismiss(alertId);
  }
}
