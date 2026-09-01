/**
 * Línea de una venta (`SaleItemResponse` en APIDOC.json). `unitPrice` es el
 * precio efectivo con el que se posteó la línea: si se omitió al crear la
 * venta, el backend lo resolvió contra la lista de precios (HU-25).
 */
export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
}

/**
 * Venta (`SaleResponse` en APIDOC.json, HU-22/HU-26). Se crea en borrador
 * sin mover stock; `POST /sales/{id}/confirmation` descuenta inventario vía
 * `SALE_OUT` validando stock disponible (RN-03), y `POST /sales/{id}/cancellation`
 * la cancela, restituyendo el inventario con `RETURN_IN` si ya estaba
 * confirmada. El status es texto libre del backend (`DRAFT`/`CONFIRMED`/
 * `CANCELLED`, sin enum documentado en APIDOC.json), igual criterio que
 * `InventoryAdjustment.approved` o `InventoryAlert.status`.
 */
export interface Sale {
  id: string;
  branchId: string;
  createdBy: string;
  /** Nulo si la venta no se resolvió contra una lista de precios. */
  priceListId: string | null;
  status: string;
  saleNumber: string;
  saleDate: string;
  notes: string;
  items: SaleItem[];
  total: number;
  createdAt: string;
}

/** Línea al crear una venta (`SaleItemRequest`); `unitPrice` es opcional (HU-25). */
export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPercentage?: number;
}

/** Datos de alta de una venta en borrador (`CreateSaleRequest`); al menos una línea. */
export interface CreateSaleInput {
  priceListId?: string;
  saleNumber: string;
  saleDate: string;
  notes?: string;
  items: CreateSaleItemInput[];
}

/**
 * Filtros + paginación de `GET /branches/{branchId}/sales` (HU-26, RF-30).
 * Igual que `InventoryAlertQuery`, la API no documenta `sortBy` para este
 * recurso, así que no se extiende `PageQuery`.
 */
export interface SaleQuery {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}
