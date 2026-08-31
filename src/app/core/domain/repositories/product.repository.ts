import { Observable } from 'rxjs';
import {
  AddProductUnitInput,
  ChangeBaseUnitInput,
  ChangeUnitFactorInput,
  CreateProductInput,
  Product,
  ProductQuery,
  UpdateProductInput,
} from '../models/product.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para productos. Mismo patrón de CRUD + baja lógica que
 * `CategoryRepository`, ampliado con la gestión de presentaciones
 * (`ProductUnit`): añadir, cambiar factor, activar/desactivar y designar
 * unidad base. Implementación en
 * `core/infrastructure/repositories/product-http.repository.ts`.
 */
export abstract class ProductRepository {
  abstract search(organizationId: string, query: ProductQuery): Observable<Page<Product>>;
  abstract getById(productId: string): Observable<Product>;
  abstract create(organizationId: string, input: CreateProductInput): Observable<Product>;
  abstract update(productId: string, input: UpdateProductInput): Observable<Product>;
  abstract activate(productId: string): Observable<Product>;
  abstract deactivate(productId: string): Observable<Product>;
  abstract addUnit(productId: string, input: AddProductUnitInput): Observable<Product>;
  abstract changeUnitFactor(
    productId: string,
    productUnitId: string,
    input: ChangeUnitFactorInput,
  ): Observable<Product>;
  abstract activateUnit(productId: string, productUnitId: string): Observable<Product>;
  abstract deactivateUnit(productId: string, productUnitId: string): Observable<Product>;
  abstract changeBaseUnit(productId: string, input: ChangeBaseUnitInput): Observable<Product>;
}
