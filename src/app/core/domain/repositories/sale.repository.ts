import { Observable } from 'rxjs';
import { CreateSaleInput, Sale, SaleQuery } from '../models/sale.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para ventas. Implementación en
 * `core/infrastructure/repositories/sale-http.repository.ts`.
 */
export abstract class SaleRepository {
  abstract search(branchId: string, query: SaleQuery): Observable<Page<Sale>>;
  abstract create(branchId: string, input: CreateSaleInput): Observable<Sale>;
  abstract getById(saleId: string): Observable<Sale>;
  abstract confirm(saleId: string): Observable<Sale>;
  abstract cancel(saleId: string): Observable<Sale>;
}
