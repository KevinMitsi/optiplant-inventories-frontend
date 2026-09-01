import { Observable } from 'rxjs';
import {
  CreateProductInput,
  CreateProductVariantInput,
  Product,
  ProductFamily,
  ProductQuery,
  UpdateProductInput,
} from '../models/product.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para productos. Mismo patrón de CRUD + baja lógica que
 * `CategoryRepository`, ampliado con la gestión de variantes: un producto
 * principal puede colgar variantes (`ProductVariantRequest`), cada una un
 * producto autónomo con su propio SKU, stock y precio. Implementación en
 * `core/infrastructure/repositories/product-http.repository.ts`.
 */
export abstract class ProductRepository {
  abstract search(organizationId: string, query: ProductQuery): Observable<Page<Product>>;
  abstract getById(productId: string): Observable<Product>;
  abstract create(organizationId: string, input: CreateProductInput): Observable<ProductFamily>;
  abstract update(productId: string, input: UpdateProductInput): Observable<Product>;
  abstract activate(productId: string): Observable<Product>;
  abstract deactivate(productId: string): Observable<Product>;
  abstract getFamily(productId: string): Observable<ProductFamily>;
  abstract listVariants(productId: string): Observable<Product[]>;
  abstract addVariant(productId: string, input: CreateProductVariantInput): Observable<Product>;
}
