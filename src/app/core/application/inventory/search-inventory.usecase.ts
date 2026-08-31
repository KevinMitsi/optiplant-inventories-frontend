import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { Inventory, InventoryQuery } from '../../domain/models/inventory.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchInventoryUseCase {
  private readonly inventoryRepository = inject(InventoryRepository);

  execute(branchId: string, query: InventoryQuery): Observable<Page<Inventory>> {
    return this.inventoryRepository.search(branchId, query);
  }
}
