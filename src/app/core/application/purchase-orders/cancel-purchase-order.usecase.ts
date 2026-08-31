import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { PurchaseOrder } from '../../domain/models/purchase-order.model';

/** Cancela la orden; el backend solo la permite antes de recibir cualquier mercancía. */
@Injectable({ providedIn: 'root' })
export class CancelPurchaseOrderUseCase {
  private readonly purchaseOrderRepository = inject(PurchaseOrderRepository);

  execute(purchaseOrderId: string): Observable<PurchaseOrder> {
    return this.purchaseOrderRepository.cancel(purchaseOrderId);
  }
}
