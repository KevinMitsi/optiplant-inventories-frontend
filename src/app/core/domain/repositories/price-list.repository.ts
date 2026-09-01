import { Observable } from 'rxjs';
import {
  CreatePriceListInput,
  PriceList,
  PriceListQuery,
  UpdatePriceListInput,
} from '../models/price-list.model';
import { ProductPrice, SetProductPriceInput } from '../models/product-price.model';
import { Page } from '../models/page.model';

/**
 * Puerto de dominio para listas de precios. Mismo patrón de CRUD + baja
 * lógica que `CategoryRepository`, ampliado con la consulta/fijación del
 * precio de un producto (`ProductPrice`) dentro de la lista — la API no
 * expone un listado de precios de una lista, solo consulta puntual por
 * `productId` (ver `getProductPrice`).
 * Implementación en `core/infrastructure/repositories/price-list-http.repository.ts`.
 */
export abstract class PriceListRepository {
  abstract search(organizationId: string, query: PriceListQuery): Observable<Page<PriceList>>;
  abstract getById(priceListId: string): Observable<PriceList>;
  abstract create(organizationId: string, input: CreatePriceListInput): Observable<PriceList>;
  abstract update(priceListId: string, input: UpdatePriceListInput): Observable<PriceList>;
  abstract activate(priceListId: string): Observable<PriceList>;
  abstract deactivate(priceListId: string): Observable<PriceList>;
  abstract getProductPrice(priceListId: string, productId: string): Observable<ProductPrice>;
  abstract setProductPrice(priceListId: string, input: SetProductPriceInput): Observable<ProductPrice>;
}
