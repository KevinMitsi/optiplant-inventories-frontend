/**
 * Precio de un producto dentro de una lista de precios (`ProductPriceResponse`
 * en APIDOC.json). Un precio por producto y lista: las variantes, al ser
 * productos completos, llevan el suyo propio.
 */
export interface ProductPrice {
  id: string;
  priceListId: string;
  productId: string;
  price: number;
}

/**
 * Fija el precio de un producto en la lista (`SetProductPriceRequest`).
 * Crea el registro si no existe, o lo reemplaza si ya estaba fijado (HU-25).
 */
export interface SetProductPriceInput {
  productId: string;
  price: number;
}
