/**
 * Unidad de medida (`UnitOfMeasureResponse` en APIDOC.json). Catálogo global
 * (no depende de la organización), pequeño y estable — no se pagina; ver
 * `GET /units-of-measure`.
 */
export interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  symbol: string;
}
