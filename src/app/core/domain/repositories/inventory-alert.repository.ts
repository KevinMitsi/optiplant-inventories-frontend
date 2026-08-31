import { Observable } from 'rxjs';
import { InventoryAlert, InventoryAlertQuery } from '../models/inventory-alert.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para alertas de inventario. Solo lectura + dos cierres
 * manuales; las alertas las abre el propio sistema, la UI nunca las crea.
 * Implementación en
 * `core/infrastructure/repositories/inventory-alert-http.repository.ts`.
 */
export abstract class InventoryAlertRepository {
  abstract search(query: InventoryAlertQuery): Observable<Page<InventoryAlert>>;
  abstract dismiss(alertId: string): Observable<InventoryAlert>;
  abstract resolve(alertId: string): Observable<InventoryAlert>;
}
