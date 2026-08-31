import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { Sale } from '../../domain/models/sale.model';

@Injectable({ providedIn: 'root' })
export class GetSaleUseCase {
  private readonly saleRepository = inject(SaleRepository);

  execute(saleId: string): Observable<Sale> {
    return this.saleRepository.getById(saleId);
  }
}
