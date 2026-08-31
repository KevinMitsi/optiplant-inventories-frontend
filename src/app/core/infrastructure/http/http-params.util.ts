import { HttpParams } from '@angular/common/http';

/**
 * Construye `HttpParams` a partir de un objeto plano, omitiendo claves
 * `undefined`/`null`/`''` (los filtros opcionales de un `PageQuery` casi
 * siempre llegan así desde un formulario). Evita repetir este filtrado en
 * cada repositorio HTTP que liste con paginación.
 */
export function toHttpParams(source: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params = params.set(key, String(value));
  }
  return params;
}
