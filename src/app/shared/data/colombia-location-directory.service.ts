import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

export interface DepartmentOption {
  code: string;
  name: string;
}

export interface MunicipalityOption {
  code: string;
  /** Valor que viaja al form/API — `Branch.city` solo guarda el nombre del municipio. */
  name: string;
  departmentCode: string;
  departmentName: string;
}

interface SocrataMunicipalityRow {
  cod_dpto: string;
  dpto: string;
  cod_mpio: string;
  nom_mpio: string;
  tipo_municipio: string;
}

// Dataset oficial DANE (División Político-Administrativa) vía Socrata SODA API.
const MUNICIPALITIES_URL =
  'https://www.datos.gov.co/resource/gdxc-w37w.json?$select=cod_dpto,dpto,cod_mpio,nom_mpio,tipo_municipio&$limit=1200';

/**
 * Directorio de municipios de Colombia (datos.gov.co, dataset DANE `gdxc-w37w`)
 * para el selector en cascada Departamento → Ciudad de Sucursales. Solo el
 * nombre del municipio (`nom_mpio`) se envía al backend — el departamento es
 * un filtro de UI, `Branch.city` no lo persiste (no romper el contrato de la API).
 */
@Injectable({ providedIn: 'root' })
export class ColombiaLocationDirectoryService {
  private readonly http = inject(HttpClient);

  private readonly municipalitiesSignal = signal<MunicipalityOption[]>([]);
  readonly municipalities = this.municipalitiesSignal.asReadonly();

  readonly departments = computed<DepartmentOption[]>(() => {
    const seen = new Map<string, DepartmentOption>();
    for (const m of this.municipalitiesSignal()) {
      if (!seen.has(m.departmentCode)) {
        seen.set(m.departmentCode, { code: m.departmentCode, name: m.departmentName });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

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

    this.http
      .get<SocrataMunicipalityRow[]>(MUNICIPALITIES_URL)
      .pipe(
        tap((rows) => {
          const options = rows
            .map((row) => ({
              code: row.cod_mpio,
              name: row.nom_mpio,
              departmentCode: row.cod_dpto,
              departmentName: row.dpto,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          this.municipalitiesSignal.set(options);
          this.loaded = true;
        }),
        catchError(() => {
          this.errorSignal.set('No se pudo cargar el listado de municipios.');
          return of(null);
        }),
      )
      .subscribe({ complete: () => this.loadingSignal.set(false) });
  }

  municipalitiesForDepartment(departmentCode: string | null): MunicipalityOption[] {
    if (!departmentCode) {
      return [];
    }
    return this.municipalitiesSignal().filter((m) => m.departmentCode === departmentCode);
  }
}
