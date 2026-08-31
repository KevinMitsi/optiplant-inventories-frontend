import { Product, ProductUnit } from '../../domain/models/product.model';
import { ProductResponseDto, ProductUnitResponseDto } from '../http/dtos/product.dto';
import { toUnitOfMeasure } from './unit-of-measure.mapper';

export function toProductUnit(dto: ProductUnitResponseDto): ProductUnit {
  return {
    id: dto.id,
    unit: toUnitOfMeasure(dto.unit),
    conversionFactor: dto.conversionFactor,
    baseUnit: dto.baseUnit,
    active: dto.active,
  };
}

export function toProduct(dto: ProductResponseDto): Product {
  return {
    id: dto.id,
    organizationId: dto.organizationId,
    categoryId: dto.categoryId ?? null,
    sku: dto.sku,
    barcode: dto.barcode ?? '',
    name: dto.name,
    description: dto.description ?? '',
    active: dto.active,
    units: dto.units.map(toProductUnit),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
