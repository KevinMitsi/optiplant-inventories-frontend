import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, catchError, expand, map, of, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CountryOption {
  /** ISO alfa-2 (`CO`, `US`...), lo único que persiste el dominio (`Branch.countryCode`). */
  code: string;
  name: string;
  /** Emoji de bandera, ya resuelto por la API — se pinta directo en el `<option>`. */
  flag: string;
  /** Prefijo internacional sin `+` (`"57"`), usado solo en el frontend para componer `phone`. */
  callingCode: string;
}

interface RestCountriesObject {
  names: { common: string };
  codes: { alpha_2: string };
  flag: { emoji: string };
  calling_codes: string[];
}

interface RestCountriesMeta {
  total: number;
  limit: number;
  offset: number;
  more: boolean;
}

interface RestCountriesResponse {
  data: { objects: RestCountriesObject[]; meta: RestCountriesMeta };
}

const REST_COUNTRIES_URL = 'https://api.restcountries.com/countries/v5';
/** Máximo permitido en el plan free del proveedor; recorremos por `offset` hasta agotar `meta.more`. */
const PAGE_LIMIT = 100;

/**
 * Directorio de países (código ISO alfa-2 + bandera) para el selector de
 * `countryCode` en Sucursales. Fuente: api.restcountries.com/countries/v5
 * (requiere `Authorization: Bearer <key>`, en `environment.countriesApiKey` —
 * quemada en `environment.development.ts` para dev, inyectada por secretos en
 * prod). Paginado (`data.meta.total/limit/offset/more`): se recorren todas
 * las páginas y se cachea el resultado combinado en memoria. Descarta
 * entidades sin `alpha_2` (territorios en disputa sin ISO asignado, ej.
 * Abkhazia) — no calzan con el patrón de `countryCode` del formulario.
 */
@Injectable({ providedIn: 'root' })
export class CountryDirectoryService {
  private readonly http = inject(HttpClient);

  private readonly countriesSignal = signal<CountryOption[]>([]);
  readonly countries = this.countriesSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  private loaded = false;

  ensureLoaded(): void {
    if (this.loaded || this.loadingSignal()) {
      return;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const headers = new HttpHeaders({ Authorization: `Bearer ${environment.countriesApiKey}` });
    const page = (offset: number) =>
      this.http.get<RestCountriesResponse>(`${REST_COUNTRIES_URL}?limit=${PAGE_LIMIT}&offset=${offset}`, {
        headers,
      });

    page(0)
      .pipe(
        expand((response) => {
          const { more, offset, limit } = response.data.meta;
          return more ? page(offset + limit) : EMPTY;
        }),
        reduce<RestCountriesResponse, RestCountriesObject[]>(
          (all, response) => [...all, ...response.data.objects],
          [],
        ),
        map((objects) =>
          objects
            .filter((entry) => entry.codes.alpha_2)
            .map((entry) => ({
              code: entry.codes.alpha_2,
              name: entry.names.common,
              flag: entry.flag.emoji,
              callingCode: entry.calling_codes?.[0] ?? '',
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        ),
        catchError(() => {
          this.errorSignal.set('No se pudo cargar el listado de países.');
          return of(null);
        }),
      )
      .subscribe({
        next: (options) => {
          if (options) {
            this.countriesSignal.set(options);
            this.loaded = true;
          }
        },
        complete: () => this.loadingSignal.set(false),
      });
  }
}
