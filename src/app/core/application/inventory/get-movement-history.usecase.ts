import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { InventoryMovement } from '../../domain/models/inventory.model';
import { Page } from '../../domain/models/page.model';
import { PageQuery } from '../../domain/models/page-query.model';

/** Histórico de movimientos de un saldo, del más reciente al más antiguo (HU-14, RN-11). */
@Injectable({ providedIn: 'root' })
export class GetMovementHistoryUseCase {
  private readonly inventoryRepository = inject(InventoryRepository);

  execute(branchId: string, productId: string, query: PageQuery): Observable<Page<InventoryMovement>> {
    return this.inventoryRepository.getMovementHistory(branchId, productId, query);
  }
}
