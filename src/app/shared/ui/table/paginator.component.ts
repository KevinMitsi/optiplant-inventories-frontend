import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Control de paginación genérico sobre `Page<T>` (página 0-index, como
 * devuelve el backend). Reutilizable por cualquier listado paginado:
 * Sucursales hoy, Productos/Proveedores/... en fases siguientes.
 */
@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="paginator">
      <span class="summary">
        @if (totalElements() > 0) {
          Página {{ page() + 1 }} de {{ totalPages() }} · {{ totalElements() }} resultados
        } @else {
          Sin resultados
        }
      </span>
      <div class="controls">
        <button type="button" [disabled]="page() === 0" (click)="goTo(page() - 1)">Anterior</button>
        <button type="button" [disabled]="!hasNext()" (click)="goTo(page() + 1)">Siguiente</button>
      </div>
    </div>
  `,
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
