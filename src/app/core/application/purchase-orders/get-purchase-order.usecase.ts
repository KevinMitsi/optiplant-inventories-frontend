import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { PurchaseOrder } from '../../domain/models/purchase-order.model';

@Injectable({ providedIn: 'root' })
export class GetPurchaseOrderUseCase {
  private readonly purchaseOrderRepository = inject(PurchaseOrderRepository);

  execute(purchaseOrderId: string): Observable<PurchaseOrder> {
    return this.purchaseOrderRepository.getById(purchaseOrderId);
  }
}
