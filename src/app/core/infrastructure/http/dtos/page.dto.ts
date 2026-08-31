/** Forma de red exacta de `PageResponse` (APIDOC.json), genérica en el ítem. */
export interface PageResponseDto<TItem> {
  content: TItem[];
  page: number;
  size: number;
  numberOfElements: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
}
