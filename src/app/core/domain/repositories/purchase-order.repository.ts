import { Observable } from 'rxjs';
import {
  CreatePurchaseOrderInput,
  PurchaseOrder,
  PurchaseOrderQuery,
  ReceivePurchaseOrderItemInput,
} from '../models/purchase-order.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para órdenes de compra. Implementación en
 * `core/infrastructure/repositories/purchase-order-http.repository.ts`.
 */
export abstract class PurchaseOrderRepository {
  abstract search(branchId: string, query: PurchaseOrderQuery): Observable<Page<PurchaseOrder>>;
  abstract create(branchId: string, input: CreatePurchaseOrderInput): Observable<PurchaseOrder>;
  abstract getById(purchaseOrderId: string): Observable<PurchaseOrder>;
  abstract confirm(purchaseOrderId: string): Observable<PurchaseOrder>;
  abstract cancel(purchaseOrderId: string): Observable<PurchaseOrder>;
  abstract receiveItem(
    purchaseOrderId: string,
    itemId: string,
    input: ReceivePurchaseOrderItemInput,
  ): Observable<PurchaseOrder>;
}
