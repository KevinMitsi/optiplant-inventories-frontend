import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { UnitOfMeasureRepository } from '../../domain/repositories/unit-of-measure.repository';
import { UnitOfMeasure } from '../../domain/models/unit-of-measure.model';
import { ApiEndpoints } from '../http/api-endpoints';
import { UnitOfMeasureResponseDto } from '../http/dtos/unit-of-measure.dto';
import { toUnitOfMeasure } from '../mappers/unit-of-measure.mapper';

@Injectable()
export class UnitOfMeasureHttpRepository extends UnitOfMeasureRepository {
  private readonly http = inject(HttpClient);

  override list(): Observable<UnitOfMeasure[]> {
    return this.http
      .get<UnitOfMeasureResponseDto[]>(ApiEndpoints.unitsOfMeasure.list())
      .pipe(map((items) => items.map(toUnitOfMeasure)));
  }
}
