import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { PurchaseOrder, PurchaseOrderQuery } from '../../domain/models/purchase-order.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchPurchaseOrdersUseCase {
  private readonly purchaseOrderRepository = inject(PurchaseOrderRepository);

  execute(branchId: string, query: PurchaseOrderQuery): Observable<Page<PurchaseOrder>> {
    return this.purchaseOrderRepository.search(branchId, query);
  }
}
