import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { ChangeBaseUnitInput, Product } from '../../domain/models/product.model';

@Injectable({ providedIn: 'root' })
export class ChangeBaseUnitUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(productId: string, input: ChangeBaseUnitInput): Observable<Product> {
    return this.productRepository.changeBaseUnit(productId, input);
  }
}
