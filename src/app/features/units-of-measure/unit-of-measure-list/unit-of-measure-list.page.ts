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
  template: `
    <h1>Unidades de medida</h1>

    @if (errorMessage(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    <table class="data-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre</th>
          <th>Símbolo</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr>
            <td colspan="3">Cargando…</td>
          </tr>
        } @else if (units().length === 0) {
          <tr>
            <td colspan="3">No hay unidades de medida registradas.</td>
          </tr>
        } @else {
          @for (unit of units(); track unit.id) {
            <tr>
              <td data-label="Código">{{ unit.code }}</td>
              <td data-label="Nombre">{{ unit.name }}</td>
              <td data-label="Símbolo">{{ unit.symbol }}</td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
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
