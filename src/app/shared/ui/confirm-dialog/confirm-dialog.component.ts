import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Diálogo de confirmación genérico para acciones destructivas o difíciles de
 * revertir (dar de baja una sucursal/transportista, etc.). Se muestra solo
 * cuando `open()` es `true` — el consumidor decide cuándo abrirlo guardando
 * la entidad objetivo en un signal y limpiándolo en `(cancel)`/`(confirm)`.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  /** Pinta el botón de confirmar en rojo y el borde superior a juego (acción irreversible/destructiva). */
  readonly danger = input(true);

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  protected readonly titleId = `confirm-dialog-title-${crypto.randomUUID()}`;
}
