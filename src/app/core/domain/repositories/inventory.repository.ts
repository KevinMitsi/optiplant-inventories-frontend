import { Observable } from 'rxjs';
import {
  Inventory,
  InventoryMovement,
  InventoryQuery,
  RegisterInventoryMovementInput,
  SetMinimumStockInput,
} from '../models/inventory.model';
import { Page } from '../models/page.model';
import { PageQuery } from '../models/page-query.model';

/**
 * Puerto de dominio para el inventario de una sucursal. No es un CRUD: los
 * saldos (`Inventory`) se crean implícitamente al primer movimiento, nunca
 * por alta directa; lo que expone son consultas de saldo/histórico y las
 * dos únicas mutaciones manuales que la API permite (entrada y salida sin
 * documento de origen). Implementación en
 * `core/infrastructure/repositories/inventory-http.repository.ts`.
 */
export abstract class InventoryRepository {
  abstract search(branchId: string, query: InventoryQuery): Observable<Page<Inventory>>;
  abstract getByProduct(branchId: string, productId: string): Observable<Inventory>;
  abstract setMinimumStock(
    branchId: string,
    productId: string,
    input: SetMinimumStockInput,
  ): Observable<Inventory>;
  abstract registerEntry(branchId: string, input: RegisterInventoryMovementInput): Observable<InventoryMovement>;
  abstract registerExit(branchId: string, input: RegisterInventoryMovementInput): Observable<InventoryMovement>;
  abstract getMovementHistory(
    branchId: string,
    productId: string,
    query: PageQuery,
  ): Observable<Page<InventoryMovement>>;
}
