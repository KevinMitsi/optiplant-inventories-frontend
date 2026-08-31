import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/models/product.model';

/**
 * Activa o desactiva un producto (baja lógica: sigue apareciendo en ventas,
 * compras y movimientos históricos, pero deja de admitir operaciones nuevas).
 */
@Injectable({ providedIn: 'root' })
export class SetProductStatusUseCase {
  private readonly productRepository = inject(ProductRepository);

  execute(productId: string, active: boolean): Observable<Product> {
    return active ? this.productRepository.activate(productId) : this.productRepository.deactivate(productId);
  }
}
