import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { ProductPrice } from '../../domain/models/product-price.model';

@Injectable({ providedIn: 'root' })
export class GetProductPriceUseCase {
  private readonly priceListRepository = inject(PriceListRepository);

  execute(priceListId: string, productId: string): Observable<ProductPrice> {
    return this.priceListRepository.getProductPrice(priceListId, productId);
  }
}
