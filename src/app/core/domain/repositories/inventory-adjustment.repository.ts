import { Observable } from 'rxjs';
import { CreateInventoryAdjustmentInput, InventoryAdjustment } from '../models/inventory-adjustment.model';

/**
 * Puerto de dominio para ajustes formales de inventario. La API no expone un
 * listado (`GET /branches/{branchId}/inventory-adjustments` no existe, solo
 * `POST` para crear); consultar uno existente requiere su identificador, igual
 * que la consulta puntual de precio de producto en `PriceListRepository`
 * (Fase 5). Implementación en
 * `core/infrastructure/repositories/inventory-adjustment-http.repository.ts`.
 */
export abstract class InventoryAdjustmentRepository {
  abstract create(branchId: string, input: CreateInventoryAdjustmentInput): Observable<InventoryAdjustment>;
  abstract getById(adjustmentId: string): Observable<InventoryAdjustment>;
  abstract approve(adjustmentId: string): Observable<InventoryAdjustment>;
}
