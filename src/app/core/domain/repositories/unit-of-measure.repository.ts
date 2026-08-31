import { Observable } from 'rxjs';
import { UnitOfMeasure } from '../models/unit-of-measure.model';

/**
 * Puerto de dominio para el catálogo de unidades de medida. Solo lectura
 * (el catálogo lo administra el backend, ver APIDOC.json: no expone
 * creación/edición por API para este recurso).
 */
export abstract class UnitOfMeasureRepository {
  abstract list(): Observable<UnitOfMeasure[]>;
}
