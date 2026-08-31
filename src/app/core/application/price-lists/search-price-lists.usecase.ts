import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { PriceList, PriceListQuery } from '../../domain/models/price-list.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchPriceListsUseCase {
  private readonly priceListRepository = inject(PriceListRepository);

  execute(organizationId: string, query: PriceListQuery): Observable<Page<PriceList>> {
    return this.priceListRepository.search(organizationId, query);
  }
}
