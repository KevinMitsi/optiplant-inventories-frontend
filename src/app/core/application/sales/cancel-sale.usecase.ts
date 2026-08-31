import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { Sale } from '../../domain/models/sale.model';

/** Cancela la venta; si estaba confirmada, restituye el inventario con un `RETURN_IN` compensatorio. */
@Injectable({ providedIn: 'root' })
export class CancelSaleUseCase {
  private readonly saleRepository = inject(SaleRepository);

  execute(saleId: string): Observable<Sale> {
    return this.saleRepository.cancel(saleId);
  }
}
