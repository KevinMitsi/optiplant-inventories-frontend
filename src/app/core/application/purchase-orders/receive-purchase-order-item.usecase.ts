import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { PurchaseOrder, ReceivePurchaseOrderItemInput } from '../../domain/models/purchase-order.model';

/** Recibe (total o parcialmente) una línea: incrementa inventario y recalcula el costo promedio ponderado (RF-21/RF-23). */
@Injectable({ providedIn: 'root' })
export class ReceivePurchaseOrderItemUseCase {
  private readonly purchaseOrderRepository = inject(PurchaseOrderRepository);

  execute(purchaseOrderId: string, itemId: string, input: ReceivePurchaseOrderItemInput): Observable<PurchaseOrder> {
    return this.purchaseOrderRepository.receiveItem(purchaseOrderId, itemId, input);
  }
}
