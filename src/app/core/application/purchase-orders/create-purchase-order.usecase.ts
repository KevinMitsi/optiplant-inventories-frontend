import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { CreatePurchaseOrderInput, PurchaseOrder } from '../../domain/models/purchase-order.model';

@Injectable({ providedIn: 'root' })
export class CreatePurchaseOrderUseCase {
  private readonly purchaseOrderRepository = inject(PurchaseOrderRepository);

  execute(branchId: string, input: CreatePurchaseOrderInput): Observable<PurchaseOrder> {
    return this.purchaseOrderRepository.create(branchId, input);
  }
}
