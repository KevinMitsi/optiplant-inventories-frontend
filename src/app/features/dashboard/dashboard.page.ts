import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder de aterrizaje tras iniciar sesión. Fases siguientes lo
 * sustituirán por el panel real (resumen de ventas, alertas de inventario...)
 * definido en `/api/v1/organizations/{organizationId}/dashboard/*`. El
 * topbar/nav ahora vive en `AppShellComponent` (ver `app.routes.ts`).
 */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Panel</h1>
    <p class="hint">Selecciona un módulo del menú para gestionar tu inventario.</p>
  `,
  styles: `
    @use 'abstracts' as ds;

    :host {
      display: block;
    }
    h1 {
      margin: 0 0 ds.space(2);
      font-size: ds.font-size('display');
      font-weight: 700;
      color: ds.color('neutral-900');
    }
    .hint {
      margin: 0;
      color: ds.color('neutral-500');
    }
  `,
})
export class DashboardPage {}
