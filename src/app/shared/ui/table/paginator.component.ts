import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Control de paginación genérico sobre `Page<T>` (página 0-index, como
 * devuelve el backend). Reutilizable por cualquier listado paginado:
 * Sucursales hoy, Productos/Proveedores/... en fases siguientes.
 */
@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss',
})
export class PaginatorComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly hasNext = input.required<boolean>();

  readonly pageChange = output<number>();

  protected goTo(nextPage: number): void {
    if (nextPage < 0) {
      return;
    }
    this.pageChange.emit(nextPage);
  }
}
