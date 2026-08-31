import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product, ProductQuery } from '../../domain/models/product.model';
import { Page } from '../../domain/models/page.model';

@Injectable({ providedIn: 'root' })
export class SearchProductsUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(organizationId: string, query: ProductQuery): Observable<Page<Product>> {
    return this.productRepository.search(organizationId, query);
  }
}
