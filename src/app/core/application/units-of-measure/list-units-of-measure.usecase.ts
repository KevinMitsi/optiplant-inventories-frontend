import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UnitOfMeasureRepository } from '../../domain/repositories/unit-of-measure.repository';
import { UnitOfMeasure } from '../../domain/models/unit-of-measure.model';

@Injectable({ providedIn: 'root' })
export class ListUnitsOfMeasureUseCase {
  private readonly unitOfMeasureRepository = inject(UnitOfMeasureRepository);

  execute(): Observable<UnitOfMeasure[]> {
    return this.unitOfMeasureRepository.list();
  }
}
