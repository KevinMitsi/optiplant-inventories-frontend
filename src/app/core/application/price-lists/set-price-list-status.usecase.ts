import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { PriceList } from '../../domain/models/price-list.model';

/** Activa o desactiva una lista de precios (baja lógica). */
@Injectable({ providedIn: 'root' })
export class SetPriceListStatusUseCase {
  private readonly priceListRepository = inject(PriceListRepository);

  execute(priceListId: string, active: boolean): Observable<PriceList> {
    return active ? this.priceListRepository.activate(priceListId) : this.priceListRepository.deactivate(priceListId);
  }
}
