import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { ProductPrice, SetProductPriceInput } from '../../domain/models/product-price.model';

@Injectable({ providedIn: 'root' })
export class SetProductPriceUseCase {
  private readonly priceListRepository = inject(PriceListRepository);

  execute(priceListId: string, input: SetProductPriceInput): Observable<ProductPrice> {
    return this.priceListRepository.setProductPrice(priceListId, input);
  }
}
