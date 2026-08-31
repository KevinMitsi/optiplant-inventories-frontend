import { PriceList } from '../../domain/models/price-list.model';
import { ProductPrice } from '../../domain/models/product-price.model';
import { PriceListResponseDto, ProductPriceResponseDto } from '../http/dtos/price-list.dto';

export function toPriceList(dto: PriceListResponseDto): PriceList {
  return {
    id: dto.id,
    organizationId: dto.organizationId,
    code: dto.code,
    name: dto.name,
    description: dto.description ?? '',
    active: dto.active,
    validFrom: dto.validFrom ?? null,
    validUntil: dto.validUntil ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toProductPrice(dto: ProductPriceResponseDto): ProductPrice {
  return {
    id: dto.id,
    priceListId: dto.priceListId,
    productId: dto.productId,
    productUnitId: dto.productUnitId,
    price: dto.price,
  };
}
