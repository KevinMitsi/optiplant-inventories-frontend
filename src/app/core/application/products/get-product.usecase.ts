import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/models/product.model';

@Injectable({ providedIn: 'root' })
export class GetProductUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(productId: string): Observable<Product> {
    return this.productRepository.getById(productId);
  }
}
