import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { Inventory } from '../../domain/models/inventory.model';

@Injectable({ providedIn: 'root' })
export class GetInventoryUseCase {
  private readonly inventoryRepository = inject(InventoryRepository);

  execute(branchId: string, productId: string): Observable<Inventory> {
    return this.inventoryRepository.getByProduct(branchId, productId);
  }
}
