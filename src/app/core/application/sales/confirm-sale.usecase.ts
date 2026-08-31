import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { Sale } from '../../domain/models/sale.model';

/** Confirma la venta y descuenta inventario vía `SALE_OUT`, validando stock disponible (RN-03). */
@Injectable({ providedIn: 'root' })
export class ConfirmSaleUseCase {
  private readonly saleRepository = inject(SaleRepository);

  execute(saleId: string): Observable<Sale> {
    return this.saleRepository.confirm(saleId);
  }
}
