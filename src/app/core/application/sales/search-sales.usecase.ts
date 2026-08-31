import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { Sale, SaleQuery } from '../../domain/models/sale.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchSalesUseCase {
  private readonly saleRepository = inject(SaleRepository);

  execute(branchId: string, query: SaleQuery): Observable<Page<Sale>> {
    return this.saleRepository.search(branchId, query);
  }
}
