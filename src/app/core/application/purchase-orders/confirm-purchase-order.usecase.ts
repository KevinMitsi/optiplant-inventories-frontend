import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { PurchaseOrder } from '../../domain/models/purchase-order.model';

/** Confirma la orden con el proveedor; a partir de aquí puede empezar a recibirse mercancía. */
@Injectable({ providedIn: 'root' })
export class ConfirmPurchaseOrderUseCase {
  private readonly purchaseOrderRepository = inject(PurchaseOrderRepository);

  execute(purchaseOrderId: string): Observable<PurchaseOrder> {
    return this.purchaseOrderRepository.confirm(purchaseOrderId);
  }
}
