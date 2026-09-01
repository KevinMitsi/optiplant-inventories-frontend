import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { CreateProductVariantInput, Product } from '../../domain/models/product.model';

@Injectable({ providedIn: 'root' })
export class AddProductVariantUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(productId: string, input: CreateProductVariantInput): Observable<Product> {
    return this.productRepository.addVariant(productId, input);
  }
}
