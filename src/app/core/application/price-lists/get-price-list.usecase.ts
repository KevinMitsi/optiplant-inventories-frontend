import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { PriceList } from '../../domain/models/price-list.model';

@Injectable({ providedIn: 'root' })
export class GetPriceListUseCase {
  private readonly priceListRepository = inject(PriceListRepository);

  execute(priceListId: string): Observable<PriceList> {
    return this.priceListRepository.getById(priceListId);
  }
}
