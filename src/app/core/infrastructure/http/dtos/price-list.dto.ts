/** Formas de red exactas de `APIDOC.json` para listas de precios. Aisladas
 * aquí; el resto de la app trabaja con `core/domain/models/price-list.model.ts`. */

export interface PriceListResponseDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceListRequestDto {
  code: string;
  name: string;
  description?: string;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdatePriceListRequestDto {
  name: string;
  description?: string;
  validFrom?: string;
  validUntil?: string;
}

export interface ProductPriceResponseDto {
  id: string;
  priceListId: string;
  productId: string;
  productUnitId: string;
  price: number;
}

export interface SetProductPriceRequestDto {
  productId: string;
  productUnitId: string;
  price: number;
}
