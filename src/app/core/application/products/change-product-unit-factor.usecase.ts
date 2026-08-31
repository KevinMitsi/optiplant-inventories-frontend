import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { ChangeUnitFactorInput, Product } from '../../domain/models/product.model';

@Injectable({ providedIn: 'root' })
export class ChangeProductUnitFactorUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(productId: string, productUnitId: string, input: ChangeUnitFactorInput): Observable<Product> {
    return this.productRepository.changeUnitFactor(productId, productUnitId, input);
  }
}
