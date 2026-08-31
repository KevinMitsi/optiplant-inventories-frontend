import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { Inventory, SetMinimumStockInput } from '../../domain/models/inventory.model';

/** Configura el stock mínimo de un producto en una sucursal (HU-15, RF-15). */
@Injectable({ providedIn: 'root' })
export class SetMinimumStockUseCase {
  private readonly inventoryRepository = inject(InventoryRepository);

  execute(branchId: string, productId: string, input: SetMinimumStockInput): Observable<Inventory> {
    return this.inventoryRepository.setMinimumStock(branchId, productId, input);
  }
}
