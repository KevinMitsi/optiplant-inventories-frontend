import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { AddProductUnitInput, Product } from '../../domain/models/product.model';

@Injectable({ providedIn: 'root' })
export class AddProductUnitUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(productId: string, input: AddProductUnitInput): Observable<Product> {
    return this.productRepository.addUnit(productId, input);
  }
}
