import { PageQuery } from './page-query.model';
import { UnitOfMeasure } from './unit-of-measure.model';

/** Producto del catálogo (`ProductResponse` en APIDOC.json). `parentProductId`
 * es no nulo cuando el producto es una variante de otro. */
export interface Product {
  id: string;
  organizationId: string;
  parentProductId: string | null;
  categoryId: string | null;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  /** Unidad en la que se contabiliza el stock. Fija: no admite factor de conversión. */
  unit: UnitOfMeasure;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Producto principal con sus variantes (`ProductFamilyResponse`). Una
 * variante NO es otra presentación del mismo stock: es un producto aparte,
 * con su propio SKU, inventario y precio.
 */
export interface ProductFamily {
  principal: Product;
  variants: Product[];
}

/** Campo de la lista de productos que se ordena. */
export type ProductSortField = 'sku' | 'name' | 'barcode' | 'active' | 'createdAt' | 'updatedAt';

/** Qué parte de la familia devuelve `GET .../products` (`scope`). */
export type ProductScope = 'ALL' | 'PRINCIPALS_ONLY' | 'VARIANTS_ONLY';

/** Filtros + paginación de `GET /organizations/{organizationId}/products`. */
export interface ProductQuery extends PageQuery {
  sortBy?: ProductSortField;
  text?: string;
  categoryId?: string;
  active?: boolean;
  scope?: ProductScope;
}

/** Variante a dar de alta junto al producto o colgada de uno existente (`ProductVariantRequest`). */
export interface CreateProductVariantInput {
  sku: string;
  name: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  /** Si se omite, hereda la unidad del producto principal. */
  unitOfMeasureId?: string;
}

/** Datos de alta de un producto (`CreateProductRequest`): la unidad es obligatoria, las variantes no. */
export interface CreateProductInput {
  sku: string;
  name: string;
  categoryId?: string;
  barcode?: string;
  description?: string;
  unitOfMeasureId: string;
  variants?: CreateProductVariantInput[];
}

/** Datos editables de un producto (`UpdateProductRequest`): sin SKU ni unidad. */
export interface UpdateProductInput {
  name: string;
  categoryId?: string;
  barcode?: string;
  description?: string;
}
