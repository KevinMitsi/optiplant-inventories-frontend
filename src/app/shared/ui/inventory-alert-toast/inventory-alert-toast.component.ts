import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryAlertNotificationsStore } from '../../../core/state/inventory-alert-notifications.store';
import { inventoryAlertTypeLabel } from '../../utils/status-labels';

/**
 * Pop-up no invasivo de alertas de inventario abiertas: esquina inferior
 * derecha, no bloquea la pantalla, se puede cerrar en cualquier momento y
 * lleva directo al listado completo (`/inventory-alerts`). Alimentado por
 * `InventoryAlertNotificationsStore` (login + polling cada 5 minutos);
 * montado una única vez en `AppShellComponent` para que sobreviva a la
 * navegación entre páginas.
 */
@Component({
  selector: 'app-inventory-alert-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-alert-toast.component.html',
  styleUrl: './inventory-alert-toast.component.scss',
})
export class InventoryAlertToastComponent {
  private readonly router = inject(Router);
  protected readonly store = inject(InventoryAlertNotificationsStore);
  protected readonly alertTypeLabel = inventoryAlertTypeLabel;

  protected goToAlerts(): void {
    this.store.dismiss();
    void this.router.navigateByUrl('/inventory-alerts');
  }

  protected close(): void {
    this.store.dismiss();
  }
}
