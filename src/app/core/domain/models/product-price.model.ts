/**
 * Precio de un producto (en una presentación concreta) dentro de una lista
 * de precios (`ProductPriceResponse` en APIDOC.json).
 */
export interface ProductPrice {
  id: string;
  priceListId: string;
  productId: string;
  productUnitId: string;
  price: number;
}

/**
 * Fija el precio de un producto en la lista (`SetProductPriceRequest`).
 * Crea el registro si no existe, o lo reemplaza si ya estaba fijado para
 * esa presentación (HU-25).
 */
export interface SetProductPriceInput {
  productId: string;
  productUnitId: string;
  price: number;
}
