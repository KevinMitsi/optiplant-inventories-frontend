/**
 * Lista de precios (`PriceListResponse` en APIDOC.json). `validFrom`/
 * `validUntil` son fechas (`date`, sin hora) opcionales que acotan su
 * vigencia; sin ellas la lista no tiene límite de fechas.
 */
export interface PriceList {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Filtros + paginación de `GET /organizations/{organizationId}/price-lists`.
 * A diferencia de Categoría/Producto/Proveedor, la API no admite `text` ni
 * `sortBy` para este recurso: solo `active`, `page` y `size`.
 */
export interface PriceListQuery {
  page?: number;
  size?: number;
  active?: boolean;
}

/** Datos de alta de una lista de precios (`CreatePriceListRequest`). */
export interface CreatePriceListInput {
  code: string;
  name: string;
  description?: string;
  validFrom?: string;
  validUntil?: string;
}

/** Datos editables de una lista de precios (`UpdatePriceListRequest`): sin código. */
export interface UpdatePriceListInput {
  name: string;
  description?: string;
  validFrom?: string;
  validUntil?: string;
}
