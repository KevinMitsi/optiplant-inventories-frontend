import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { CreatePriceListInput, PriceList } from '../../domain/models/price-list.model';

@Injectable({ providedIn: 'root' })
export class CreatePriceListUseCase {
  private readonly priceListRepository = inject(PriceListRepository);

  execute(organizationId: string, input: CreatePriceListInput): Observable<PriceList> {
    return this.priceListRepository.create(organizationId, input);
  }
}
