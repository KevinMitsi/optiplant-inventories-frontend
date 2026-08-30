/**
 * Página de resultados con metadatos de navegación (ver `PageResponse` en APIDOC.json).
 * Genérica: cada feature la tipa con su propia entidad (`Page<Product>`, `Page<Branch>`...).
 */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  numberOfElements: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
}
