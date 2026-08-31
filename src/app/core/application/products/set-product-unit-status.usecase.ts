import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/models/product.model';

/**
 * Activa o desactiva una presentación del producto. La API rechaza dar de
 * baja la unidad base (422): antes hay que designar otra como base con
 * `ChangeBaseUnitUseCase`.
 */
@Injectable({ providedIn: 'root' })
export class SetProductUnitStatusUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(productId: string, productUnitId: string, active: boolean): Observable<Product> {
    return active
      ? this.productRepository.activateUnit(productId, productUnitId)
      : this.productRepository.deactivateUnit(productId, productUnitId);
  }
}
