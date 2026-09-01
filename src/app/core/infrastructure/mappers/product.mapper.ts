import { Product, ProductFamily } from '../../domain/models/product.model';
import { ProductFamilyResponseDto, ProductResponseDto } from '../http/dtos/product.dto';
import { toUnitOfMeasure } from './unit-of-measure.mapper';

export function toProduct(dto: ProductResponseDto): Product {
  return {
    id: dto.id,
    organizationId: dto.organizationId,
    parentProductId: dto.parentProductId ?? null,
    categoryId: dto.categoryId ?? null,
    sku: dto.sku,
    barcode: dto.barcode ?? '',
    name: dto.name,
    description: dto.description ?? '',
    unit: toUnitOfMeasure(dto.unit),
    active: dto.active,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toProductFamily(dto: ProductFamilyResponseDto): ProductFamily {
  return {
    principal: toProduct(dto.principal),
    variants: dto.variants.map(toProduct),
  };
}
