import { PageQuery } from './page-query.model';
import { UnitOfMeasure } from './unit-of-measure.model';

/**
 * Presentación en la que se maneja un producto (`ProductUnitResponse` en
 * APIDOC.json). `conversionFactor` indica cuántas unidades base equivale una
 * de esta presentación; la presentación con `baseUnit: true` vale siempre 1
 * y es en la que se contabiliza el stock.
 */
export interface ProductUnit {
  id: string;
  unit: UnitOfMeasure;
  conversionFactor: number;
  baseUnit: boolean;
  active: boolean;
}

/** Producto del catálogo (`ProductResponse` en APIDOC.json) con sus presentaciones. */
export interface Product {
  id: string;
  organizationId: string;
  categoryId: string | null;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  active: boolean;
  units: ProductUnit[];
  createdAt: string;
  updatedAt: string;
}

/** Campo de la lista de productos que se ordena. */
export type ProductSortField = 'sku' | 'name' | 'barcode' | 'active' | 'createdAt' | 'updatedAt';

/** Filtros + paginación de `GET /organizations/{organizationId}/products`. */
export interface ProductQuery extends PageQuery {
  sortBy?: ProductSortField;
  text?: string;
  categoryId?: string;
  active?: boolean;
}

/** Datos de alta de un producto (`CreateProductRequest`): la unidad base es obligatoria. */
export interface CreateProductInput {
  sku: string;
  name: string;
  categoryId?: string;
  barcode?: string;
  description?: string;
  baseUnitId: string;
}

/** Datos editables de un producto (`UpdateProductRequest`): sin SKU ni unidad base. */
export interface UpdateProductInput {
  name: string;
  categoryId?: string;
  barcode?: string;
  description?: string;
}

/** Añade una presentación adicional al producto (`AddProductUnitRequest`). */
export interface AddProductUnitInput {
  unitOfMeasureId: string;
  conversionFactor: number;
}

/** Nuevo factor de conversión de una presentación (`ChangeUnitFactorRequest`). */
export interface ChangeUnitFactorInput {
  conversionFactor: number;
}

/**
 * Designa otra presentación como unidad base (`ChangeBaseUnitRequest`). El
 * factor de la base anterior se exige porque su equivalencia con la nueva
 * base no es deducible (es una decisión de negocio, no un cálculo).
 */
export interface ChangeBaseUnitInput {
  newBaseProductUnitId: string;
  previousBaseNewFactor: number;
}
