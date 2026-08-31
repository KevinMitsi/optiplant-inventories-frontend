import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { CreateProductInput, Product } from '../../domain/models/product.model';

@Injectable({ providedIn: 'root' })
export class CreateProductUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(organizationId: string, input: CreateProductInput): Observable<Product> {
    return this.productRepository.create(organizationId, input);
  }
}
