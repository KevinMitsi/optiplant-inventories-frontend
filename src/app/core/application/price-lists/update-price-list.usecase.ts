import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { PriceList, UpdatePriceListInput } from '../../domain/models/price-list.model';

@Injectable({ providedIn: 'root' })
export class UpdatePriceListUseCase {
  private readonly priceListRepository = inject(PriceListRepository);

  execute(priceListId: string, input: UpdatePriceListInput): Observable<PriceList> {
    return this.priceListRepository.update(priceListId, input);
  }
}
