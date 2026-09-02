import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap, tap, timer } from 'rxjs';
import { SearchInventoryAlertsUseCase } from '../application/inventory-alerts/search-inventory-alerts.usecase';
import { InventoryAlert } from '../domain/models/inventory-alert.model';
import { AuthStore } from './auth-store.service';

/** 5 minutos, en milisegundos (ver requerimiento del pop-up de alertas). */
const POLL_INTERVAL_MS = 5 * 60 * 1000;

/** Cuántas alertas abiertas se muestran como avance dentro del pop-up. */
const PREVIEW_SIZE = 3;

/**
 * Alimenta el pop-up no invasivo de alertas de inventario (esquina inferior
 * derecha, ver `InventoryAlertToastComponent`). No crea ni cierra alertas —
 * solo reconsulta `GET /inventory-alerts?status=OPEN` (mismo caso de uso que
 * `InventoryAlertListPage`) al iniciar sesión y cada 5 minutos mientras la
 * sesión siga activa, y expone las abiertas para pintarlas.
 *
 * "Iniciar sesión" se traduce como `authStore.isAuthenticated()` pasando a
 * `true`: cubre tanto el login explícito como recargar la app con una sesión
 * ya válida (RF de pop-up al abrir la pantalla del usuario). El pop-up puede
 * cerrarse en cualquier momento (`dismiss()`) sin tocar el estado de las
 * alertas en el backend; si siguen abiertas, reaparece en el siguiente ciclo
 * de 5 minutos.
 */
@Injectable({ providedIn: 'root' })
export class InventoryAlertNotificationsStore {
  private readonly searchInventoryAlertsUseCase = inject(SearchInventoryAlertsUseCase);
  private readonly authStore = inject(AuthStore);

  private readonly openAlertsSignal = signal<InventoryAlert[]>([]);
  private readonly dismissedSignal = signal(true);

  readonly openAlerts = this.openAlertsSignal.asReadonly();
  readonly previewAlerts = computed(() => this.openAlertsSignal().slice(0, PREVIEW_SIZE));
  readonly extraCount = computed(() => Math.max(0, this.openAlertsSignal().length - PREVIEW_SIZE));
  readonly visible = computed(() => !this.dismissedSignal() && this.openAlertsSignal().length > 0);

  constructor() {
    toObservable(this.authStore.isAuthenticated)
      .pipe(
        tap((authenticated) => {
          if (!authenticated) {
            this.openAlertsSignal.set([]);
            this.dismissedSignal.set(true);
          }
        }),
        switchMap((authenticated) => (authenticated ? timer(0, POLL_INTERVAL_MS) : EMPTY)),
        switchMap(() =>
          this.searchInventoryAlertsUseCase.execute({ status: 'OPEN', size: 20 }).pipe(catchError(() => EMPTY)),
        ),
      )
      .subscribe((page) => {
        this.openAlertsSignal.set(page.content);
        // Cada ciclo (login incluido) vuelve a mostrarse mientras haya
        // alertas sin manejar, aunque el usuario haya cerrado el pop-up antes.
        this.dismissedSignal.set(false);
      });
  }

  dismiss(): void {
    this.dismissedSignal.set(true);
  }
}
