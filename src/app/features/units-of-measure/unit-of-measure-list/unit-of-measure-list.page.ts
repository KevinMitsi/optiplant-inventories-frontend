import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ListUnitsOfMeasureUseCase } from '../../../core/application/units-of-measure/list-units-of-measure.usecase';
import { UnitOfMeasure } from '../../../core/domain/models/unit-of-measure.model';

/**
 * Catálogo de unidades de medida: solo lectura, sin paginación (APIDOC.json
 * lo describe como "conjunto pequeño y estable que el cliente suele
 * cachear"). No hay alta/edición porque la API no expone esas operaciones
 * para este recurso.
 */
@Component({
  selector: 'app-unit-of-measure-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './unit-of-measure-list.page.html',
  styleUrl: './unit-of-measure-list.page.scss',
})
export class UnitOfMeasureListPage {
  private readonly listUnitsOfMeasureUseCase = inject(ListUnitsOfMeasureUseCase);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly units = signal<UnitOfMeasure[]>([]);

  constructor() {
    this.listUnitsOfMeasureUseCase
      .execute()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (units) => this.units.set(units),
        error: () => this.errorMessage.set('No se pudo cargar el catálogo de unidades de medida.'),
      });
  }
}
