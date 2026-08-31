import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { CreateSaleInput, Sale } from '../../domain/models/sale.model';

@Injectable({ providedIn: 'root' })
export class CreateSaleUseCase {
  private readonly saleRepository = inject(SaleRepository);

  execute(branchId: string, input: CreateSaleInput): Observable<Sale> {
    return this.saleRepository.create(branchId, input);
  }
}
