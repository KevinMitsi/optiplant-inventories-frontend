/** Formas de red exactas de `APIDOC.json` para productos. Aisladas aquí; el
 * resto de la app trabaja con `core/domain/models/product.model.ts`. */
import { UnitOfMeasureResponseDto } from './unit-of-measure.dto';

export interface ProductUnitResponseDto {
  id: string;
  unit: UnitOfMeasureResponseDto;
  conversionFactor: number;
  baseUnit: boolean;
  active: boolean;
}

export interface ProductResponseDto {
  id: string;
  organizationId: string;
  categoryId?: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  active: boolean;
  units: ProductUnitResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequestDto {
  sku: string;
  name: string;
  categoryId?: string;
  barcode?: string;
  description?: string;
  baseUnitId: string;
}

export interface UpdateProductRequestDto {
  name: string;
  categoryId?: string;
  barcode?: string;
  description?: string;
}

export interface AddProductUnitRequestDto {
  unitOfMeasureId: string;
  conversionFactor: number;
}

export interface ChangeUnitFactorRequestDto {
  conversionFactor: number;
}

export interface ChangeBaseUnitRequestDto {
  newBaseProductUnitId: string;
  previousBaseNewFactor: number;
}
