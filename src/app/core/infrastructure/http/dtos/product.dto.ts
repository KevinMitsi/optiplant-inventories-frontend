/** Formas de red exactas de `APIDOC.json` para productos. Aisladas aquí; el
 * resto de la app trabaja con `core/domain/models/product.model.ts`. */
import { UnitOfMeasureResponseDto } from './unit-of-measure.dto';

export interface ProductResponseDto {
  id: string;
  organizationId: string;
  parentProductId?: string;
  categoryId?: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  unit: UnitOfMeasureResponseDto;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFamilyResponseDto {
  principal: ProductResponseDto;
  variants: ProductResponseDto[];
}

export interface ProductVariantRequestDto {
  sku: string;
  name: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  unitOfMeasureId?: string;
}

export interface CreateProductRequestDto {
  sku: string;
  name: string;
  categoryId?: string;
  barcode?: string;
  description?: string;
  unitOfMeasureId: string;
  variants?: ProductVariantRequestDto[];
}

export interface UpdateProductRequestDto {
  name: string;
  categoryId?: string;
  barcode?: string;
  description?: string;
}
