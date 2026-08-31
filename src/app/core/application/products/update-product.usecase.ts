import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product, UpdateProductInput } from '../../domain/models/product.model';

@Injectable({ providedIn: 'root' })
export class UpdateProductUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(productId: string, input: UpdateProductInput): Observable<Product> {
    return this.productRepository.update(productId, input);
  }
}
