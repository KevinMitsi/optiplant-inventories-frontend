import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { CreateProductInput, ProductFamily } from '../../domain/models/product.model';

@Injectable({ providedIn: 'root' })
export class CreateProductUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(organizationId: string, input: CreateProductInput): Observable<ProductFamily> {
    return this.productRepository.create(organizationId, input);
  }
}
